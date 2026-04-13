# Split Revenue Platform - Aptos

A hybrid Web2/Web3 platform for creator teams to automate revenue splitting and receive payments on the Aptos blockchain.

## Overview

**Problem:** Platforms like Patreon and Ko-fi are built for solo creators and lack native revenue splitting, leaving teams to manually split payments manually (error-prone, slow, opaque).

**Solution:** Automated revenue splitting on-chain using smart contracts, with a Web2-friendly UX and USDC stablecoin payments.

## Architecture

### High-Level Flow

```
1. User Creates Account
   └─> Email/OAuth → Auto-create wallet (server-side, encrypted)

2. User Creates Project
   └─> Add collaborators → Define split % → Create SplitConfig on-chain

3. Customer Purchases
   └─> Visit project page → Pay via USDC/fiat → Funds go to treasury wallet

4. Automated Batch Payout (daily/weekly)
   └─> Create PayoutBatch → Execute on-chain → Coins split to collaborators
   └─> Record payouts in offchain DB for transparency

5. Collaborators View History
   └─> Dashboard shows all payouts received per project
```

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Web2 UX)                       │
│  - Patreon-like interface                                   │
│  - OAuth login (email/Google/Discord)                       │
│  - Project creation & split management                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
     ┌─────────────────┼──────────────────┐
     │                 │                  │
┌────▼────┐   ┌────────▼────────┐   ┌────▼──────┐
│ Backend  │   │ Stripe/Payment  │   │ Aptos     │
│ Services │   │ Processor       │   │ Blockchain
├──────────┤   └─────────────────┘   ├───────────┤
│ Auth     │                         │ SplitConfig
│ Wallet   │                         │ Revenue   │
│ Projects │                         │ Splitter  │
│ Payouts  │                         │ Registry  │
│ Splits   │                         └───────────┘
└────┬─────┘
     │
┌────▼──────────────────────────────┐
│  PostgreSQL Database (Offchain)    │
├────────────────────────────────────┤
│ - Users & wallets (encrypted)      │
│ - Projects & collaborators         │
│ - Split configurations (audit log) │
│ - Purchase history                 │
│ - Payout history & sync records    │
└────────────────────────────────────┘
```

## Project Structure

```
split-revenue-platform/
├── contracts/                    # Aptos Move smart contracts
│   ├── Move.toml
│   └── sources/
│       ├── split_config.move        # Manage split configs + proposals
│       ├── revenue_splitter.move    # Execute batched payouts
│       └── payout_registry.move     # Immutable payout records
├── backend/                      # Node.js backend service
│   ├── src/
│   │   ├── index.ts              # Entry point
│   │   ├── wallet.ts             # Wallet generation/encryption
│   │   ├── database.ts           # PostgreSQL operations
│   │   ├── aptos-client.ts       # Blockchain interactions
│   │   ├── auth.ts               # Authentication (TODO)
│   │   ├── splits.ts             # Split management (TODO)
│   │   └── payouts.ts            # Payout orchestration (TODO)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── database/
│   └── schema.sql                # PostgreSQL schema
└── docs/
    └── API.md                    # API documentation (TODO)
```

## Data Model

### Offchain (PostgreSQL)

**Users:**
- Email authentication or OAuth
- Auto-generated wallet address
- Encrypted private key (server-side only)
- Profile info

**Projects:**
- Creator, name, description, price (USDC)
- On-chain reference ID (smart contract project_id)
- Active/inactive status

**Collaborators:**
- Project membership tracking
- Role (creator, contributor, editor)
- Status (invited, accepted, removed)
- Split percentage reference

**Purchases:**
- Project, customer, amount, status
- Payment method (credit_card, crypto, etc)
- Stripe transaction reference

**Payout History:**
- Batch-based payouts
- Recipient, amount, status
- On-chain transaction hash reference
- Timestamp & sync status

**Split Configurations:**
- Versioned history for audit trail
- Config data as JSON
- Linked to on-chain version

### Onchain (Aptos)

**SplitConfig:**
```
struct SplitConfig {
    project_id: u64,
    version: u64,
    collaborators: vector<address>,
    split_percentages: vector<u64>,  // basis points (5000 = 50%)
    is_active: bool,
    can_edit: address,  // typically creator
    treasury_address: address,
    created_at: u64,
}
```

**PayoutBatch:**
```
struct PayoutBatch {
    batch_id: u64,
    project_id: u64,
    total_amount: u64,              // USDC micro-units
    split_amounts: vector<u64>,
    recipients: vector<address>,
    status: u8,                      // 0: pending, 1: executed, 2: failed
    coins_held: Coin<USDC>,          // in escrow
}
```

**PayoutRecord (immutable):**
```
struct PayoutRecord {
    record_id: u64,
    batch_id: u64,
    project_id: u64,
    recipient: address,
    amount: u64,
    execution_timestamp: u64,
    transaction_hash: vector<u8>,
    status: u8,                      // 0: pending, 1: success, 2: failed
}
```

## Key Features

### 1. Automatic Wallet Creation
- User signs up with email/OAuth
- Backend generates Aptos keypair using aptos SDK
- Private key encrypted with AES-256-CBC (admin key managed via env)
- Public wallet address stored in DB
- User never sees private key (Web2 UX)

### 2. Split Configuration Management
- Creator proposes new split when collaborator leaves
- Collaborators must agree on new percentages
- Creator (admin) approves the new config
- On-chain state transitions to new version atomically
- Old config archived for audit trail

### 3. Batched Payouts (Gas Optimization)
- Don't execute payouts immediately on each purchase
- Batch purchases from 24-hour window into single transaction
- Single split execution call = massive gas savings
- Reduce costs for creators significantly

### 4. USDC Stablecoin Payments
- All prices & payouts in USDC (1 USDC = $1)
- No volatility risk for creators
- Easy accounting & tax reporting
- Transfers via Aptos coin transfer mechanism

### 5. Off-chain/On-chain Sync
- Purchases recorded offchain immediately
- Batch processed and sent on-chain during payout window
- PayoutRecords created on-chain for immutable audit trail
- Both systems serve as source of truth for different purposes:
  - **Offchain:** Real-time UX, customer service, tax reports
  - **Onchain:** Immutable proof, dispute resolution, transparency

## Setup & Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Aptos CLI
- A funded Aptos testnet account

### 1. Database Setup
```bash
psql -U postgres -d postgres -f database/schema.sql
```

### 2. Smart Contract Deployment
```bash
cd contracts
aptos move publish --profile testnet
# Update backend/.env with APTOS_MODULE_ADDRESS from output
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
npm run dev
```

### 4. Environment Configuration
Create `.env` file in `backend/`:
```env
DATABASE_URL=postgres://user:pass@localhost/split_revenue_db
APTOS_NODE_URL=https://testnet.api.aptos.dev/v1
APTOS_MODULE_ADDRESS=0x... # Your deployed module
APTOS_ADMIN_PRIVATE_KEY=... # Admin account hex privkey
WALLET_ENCRYPTION_KEY=... # Min 32 chars
```

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/signup` - Create account with email
- `POST /api/auth/oauth` - OAuth login
- `POST /api/auth/login` - Email login

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/collaborators` - Add/invite collaborators

### Splits
- `GET /api/projects/:id/splits/current` - Get current split config
- `POST /api/projects/:id/splits/propose` - Propose new split
- `POST /api/projects/:id/splits/:proposal_id/approve` - Approve proposal

### Payouts
- `GET /api/payouts/history` - Get payout history for user
- `POST /api/admin/payouts/batch` - Trigger batch payout (admin only)
- `GET /api/payouts/batch/:batch_id` - Get batch details

### Purchases
- `POST /api/purchases` - Create purchase (Stripe webhook)
- `POST /api/purchases/:id/confirm` - Confirm purchase after payment

## Security Considerations

### Private Key Management
**Current approach (development):**
- Private keys encrypted with AES-256-CBC
- Encryption key from environment variable

**Production recommendations:**
- Use AWS KMS or HashiCorp Vault
- Implement key rotation policy
- Add multi-signature for admin functions
- Audit logging for all key access

### Smart Contract Auditing
- [ ] Internal review of Move code
- [ ] External audit by Aptos security firm
- [ ] Formal verification of split logic
- [ ] Fuzzing tests for edge cases

### Database Security
- [ ] Enable PostgreSQL SSL
- [ ] Implement row-level security (RLS)
- [ ] Regular backups to secure storage
- [ ] Encrypted backups in transit

## Tokenomics Design

### Platform Token (TBD)
- **Utility:** Governance, fee discounts, staking
- **Supply:** TBD
- **Allocation:** 
  - 70% Creator rewards (protocol treasury)
  - 20% Team
  - 10% Advisors

### Revenue Model
1. **Platform Fee:** 2-5% on all transactions
   - 100% auto-split back to creators monthly
   - Incentivizes platform tokens
2. **Premium Features:** TBD (optional high-tier creators)
3. **API Access:** For integrations

### Fee Distribution Example
```
Customer pays: $100 USDC
Platform fee: $3 (3%)
Split to creators: $97
Platform treasury: $3 → Distributed to $TOKEN holders
```

## Testing

### Unit Tests (Move)
```bash
cd contracts
aptos move test
```

### Integration Tests (Backend)
```bash
cd backend
npm run test
```

### End-to-End Tests
- [ ] Create account → Create project → Invite collaborator
- [ ] Configure splits → Process purchase → Verify payout
- [ ] Change split config → Verify new batches use new config

## Monitoring & Operations

### Key Metrics to Track
- New users/projects per day
- Total TVL (total USDC in system)
- Average payout batch size/gas cost
- Customer payment success rate
- Smart contract transaction costs

### Operational Tasks
- Daily: Process batch payouts
- Weekly: Review failed transactions
- Monthly: Generate creator reports
- Quarterly: Security audits

## Future Enhancements

1. **Native Mobile App** - iOS/Android for on-the-go payout tracking
2. **DAO Treasury Integration** - Support for collective governance splits
3. **Programmable Payouts** - Milestone-based, time-locked, or conditional splits
4. **Multi-Currency** - Support ETH, SOL, USDT on Aptos
5. **Creator Analytics** - Detailed revenue insights & forecasting
6. **Marketplace** - Discover and subscribe to creator projects
7. **NFT Memberships** - Mint NFT for tier-based access
8. **Cross-chain Bridging** - Settle on Ethereum/Solana if needed

## Team & Development

**Current Phase:**
- Architecture & smart contract design ✅
- Backend scaffolding ✅
- Database schema ✅
- Initial implementation (in progress)

**Next Phase:**
- Complete API endpoints
- Frontend UI (React)
- Integration testing
- Security audit
- Testnet deployment

## Resources

- [Aptos Documentation](https://aptos.dev/)
- [Aptos Move Book](https://move-language.github.io/)
- [USDC on Aptos](https://www.circle.com/usdc)
- [Stripe API](https://stripe.com/docs/api)

## License

MIT

---

**Questions?** Check `docs/FAQ.md` or open an issue.

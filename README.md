# Splitr

Automated revenue splitting for creator teams, built on the Aptos blockchain.

## Overview

**Problem:** Platforms like Patreon and Ko-fi are built for solo creators. Teams are left manually splitting payments — slow, error-prone, and opaque.

**Solution:** Smart contracts on Aptos automatically distribute every payment to collaborators, with a Web2-friendly UX and USDC stablecoin payments.

## How It Works

```
1. Create Account
   └─> Email/OAuth → auto-generated Aptos wallet (server-side, encrypted)

2. Create Project
   └─> Add collaborators → define split % → register SplitConfig on-chain

3. Customers Purchase
   └─> Pay via USDC/fiat → funds held in treasury wallet

4. Automated Batch Payout (every 24h)
   └─> Purchases batched → executed on-chain → coins split to collaborators
   └─> Payout records written on-chain for immutable audit trail

5. Collaborators Track Earnings
   └─> Dashboard shows all payouts received per project, with tx hashes
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                        │
│  - Email / Google OAuth login                                 │
│  - Project creation & collaborator management                 │
│  - Payout history with on-chain tx links                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
   ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐
   │   Backend   │  │    Stripe /   │  │    Aptos    │
   │  (Express)  │  │  Payment      │  │  Blockchain │
   ├─────────────┤  └───────────────┘  ├─────────────┤
   │ Auth & JWT  │                     │ SplitConfig │
   │ Wallets     │                     │ Revenue     │
   │ Projects    │                     │ Splitter    │
   │ Payouts     │                     │ Payout      │
   └──────┬──────┘                     │ Registry    │
          │                            └─────────────┘
   ┌──────▼──────────────────────────┐
   │  PostgreSQL (off-chain)          │
   │  Users, projects, collaborators  │
   │  Purchase history, payout log    │
   └──────────────────────────────────┘
```

## Project Structure

```
splitr/
├── contracts/                    # Aptos Move smart contracts
│   ├── Move.toml
│   └── sources/
│       ├── split_config.move         # Split config management
│       ├── revenue_splitter.move     # Batched payout execution
│       └── payout_registry.move      # Immutable payout records
├── backend/                      # Express.js API
│   ├── src/
│   │   ├── index.ts              # Entry point & routes
│   │   ├── auth.ts               # JWT + bcrypt auth
│   │   ├── wallet.ts             # Wallet generation (AES-256-CBC)
│   │   ├── database.ts           # PostgreSQL queries
│   │   └── aptos-client.ts       # Blockchain interactions
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                     # Next.js 14 app
│   ├── pages/
│   │   ├── index.tsx             # Landing page
│   │   ├── dashboard.tsx         # User dashboard
│   │   ├── projects/
│   │   │   ├── index.tsx         # Project listing
│   │   │   └── new.tsx           # Create project
│   │   └── payouts.tsx           # Payout history
│   ├── components/
│   │   └── Navigation.tsx
│   └── context/
│       └── AuthContext.tsx
└── database/
    └── schema.sql
```

## Key Features

### Automatic Wallet Creation
Users sign up with email or Google OAuth. Splitr auto-generates an Aptos keypair server-side, encrypts the private key with AES-256-CBC, and stores the wallet address in the database. No seed phrases or crypto knowledge required.

### Collaborator Split Management
Project creators add collaborators by email and define each person's split percentage. Split percentages must total 100%. When a collaborator isn't registered yet, they're flagged and can be added once they sign up.

### Batched Payouts (Gas Optimisation)
Purchases are accumulated over a 24-hour window and executed as a single on-chain batch transaction, dramatically reducing gas costs compared to per-purchase payouts.

### On-Chain Transparency
Every payout is recorded on Aptos as an immutable `PayoutRecord`. Collaborators can verify their earnings independently via the Aptos Explorer — no need to trust the platform.

### USDC Stablecoin
All prices and payouts are denominated in USDC (stored as micro-units: 1 USDC = 1,000,000). No volatility risk for creators.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Aptos CLI (for contract deployment)

### 1. Database

**With Docker (recommended):**
```bash
docker run -d --name splitr-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=split_revenue \
  -p 5432:5432 postgres:14
```

**Or run the schema against an existing instance:**
```bash
psql -U postgres -d split_revenue -f database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, WALLET_ENCRYPTION_KEY
npm run dev
```

**Environment variables:**
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/split_revenue
JWT_SECRET=your-secret-here
WALLET_ENCRYPTION_KEY=min-32-chars
APTOS_NODE_URL=https://testnet.api.aptos.dev/v1
APTOS_MODULE_ADDRESS=0x...
APTOS_ADMIN_PRIVATE_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:3001
```

### 4. Smart Contracts
```bash
cd contracts
aptos move publish --profile testnet
# Copy the module address into backend/.env
```

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register with email |
| POST | `/api/auth/login` | Email login |
| GET | `/api/auth/google` | Google OAuth |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project details |

### Payouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payouts` | Payout history for user |
| POST | `/api/admin/payouts/batch` | Trigger batch payout (admin) |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wallet` | Get wallet address & balance |

## Revenue Model

```
Customer pays: $100 USDC
Platform fee:  $3  (3%)
To creators:   $97 → split per configured percentages
```

## Security Notes

- Private keys are AES-256-CBC encrypted at rest; the encryption key lives only in the server environment
- For production: use AWS KMS or HashiCorp Vault for key management
- Smart contracts should be externally audited before mainnet

## Roadmap

- [ ] Stripe / fiat on-ramp integration
- [ ] Smart contract testnet deployment
- [ ] Batch payout scheduler
- [ ] Mobile app (iOS / Android)
- [ ] Milestone-based and time-locked payouts
- [ ] Creator analytics dashboard
- [ ] Multi-currency support (USDT, ETH bridged)

## Resources

- [Aptos Documentation](https://aptos.dev/)
- [Move Book](https://move-language.github.io/)
- [USDC on Aptos](https://www.circle.com/usdc)

## License

MIT

# System Architecture Diagrams

## Overall Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                              │
│  (Web UI - React/Vue)  - OAuth/Email Login - Project Dashboard       │
└──────────────┬───────────────────────────────────────────────────────┘
               │ HTTPS REST API
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Backend Layer (Node.js)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐          │
│  │  Auth       │  │  Wallet      │  │  Project/Split      │          │
│  │  Service    │  │  Manager     │  │  Services           │          │
│  │             │  │              │  │                     │          │
│  │ • JWT       │  │ • Generate   │  │ • Create projects   │          │
│  │ • OAuth     │  │ • Encrypt    │  │ • Manage splits     │          │
│  │ • Sessions  │  │ • Storage    │  │ • Validate configs  │          │
│  └─────────────┘  └──────────────┘  └─────────────────────┘          │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ Payout           │  │  Aptos Blockchain Adapter                │  │
│  │ Orchestration    │  │  • Send transactions                     │  │
│  │                  │  │  • Read contract state                   │  │
│  │ • Batch logic    │  │  • Verify receipts                       │  │
│  │ • Scheduling     │  │  • Event parsing                         │  │
│  │ • Error recovery │  │                                          │  │
│  └──────────────────┘  └──────────────────────────────────────────┘  │
└──────────┬──────────────────────────┬────────────────────────────────┘
           │                          │
           │ SQL queries              │ Blockchain
           │                          │ transactions
           ▼                          ▼
    ┌────────────┐          ┌──────────────────┐
    │ PostgreSQL │          │ Aptos Testnet/   │
    │ Database   │          │ Mainnet          │
    │            │          │                  │
    │ • Users    │          │ Smart Contracts: │
    │ • Projects │          │ • split_config   │
    │ • Payouts  │          │ • revenue_split  │
    │ • History  │          │ • payout_regist  │
    └────────────┘          └──────────────────┘
         Offchain                  Onchain
```

## User Journey

```
SIGNUP FLOW
═══════════════════════════════════════════════════════════════════════

User visits website
        │
        ▼
Clicks "Create Account"
        │
        ▼
┌─────────────────────────────┐
│ Option 1: Email             │  Option 2: OAuth
│ ├─ Enter email              │  ├─ Google Login
│ ├─ Create password          │  ├─ Discord Login
│ └─ Verify email             │  └─ Redirect back
└─────────────────────────────┘
        │
        ▼ (Backend)
┌─────────────────────────────────────────────────┐
│ 1. Hash password with bcryptjs                  │
│ 2. Generate Aptos keypair (AptosAccount)        │
│ 3. Encrypt private key with AES-256-CBC         │
│ 4. Store in database:                           │
│    - email                                       │
│    - password_hash                               │
│    - wallet_address (public)                     │
│    - wallet_private_key_encrypted                │
│ 5. Generate JWT token                           │
└─────────────────────────────────────────────────┘
        │
        ▼
✅ Account Created!
   User dashboard loads
   Wallet ready (hidden from user)
```

## Project Creation & Split Configuration

```
PROJECT CREATION FLOW
═══════════════════════════════════════════════════════════════════════

Creator clicks "Create Project"
        │
        ▼
┌─────────────────────────────────────┐
│ Fill in project details:            │
│ - Project name                      │
│ - Description                       │
│ - Cover image                       │
│ - Price (e.g., $49.99)             │
│ - Initial collaborators & splits    │
│   (e.g., Dev: 60%, Artist: 40%)    │
└─────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────┐
│ Validation                               │
│ ✓ Price > 0                             │
│ ✓ Split percentages sum to 100%        │
│ ✓ All collaborators are valid users    │
│ ✓ Same user not added twice            │
└──────────────────────────────────────────┘
        │
        ▼ (Backend)
┌──────────────────────────────────────────────────────┐
│ 1. Create project record in DB:                      │
│    INSERT INTO projects (name, creator_id, price)   │
│                                                      │
│ 2. Call smart contract on-chain:                    │
│    split_config::create_split_config(               │
│      project_id=123,                                │
│      collaborators=[addr1, addr2],                  │
│      percentages=[6000, 4000],    // 60%, 40%      │
│      treasury_address=platform_wallet               │
│    )                                                 │
│                                                      │
│ 3. Save on_chain_id from contract to DB             │
│    UPDATE projects SET on_chain_id = 123            │
│                                                      │
│ 4. Record split config in audit table:              │
│    INSERT INTO split_configs (config_version, ...)  │
└──────────────────────────────────────────────────────┘
        │
        ▼
✅ Project Created!
   Project page live
   Customers can now purchase
   Collaborators see dashboard


SPLIT RECONFIGURATION FLOW (When collaborator leaves)
═══════════════════════════════════════════════════════

Creator wants to update split (collaborator leaving)
        │
        ▼
Creator clicks "Manage Split"
        │
        ▼
┌──────────────────────────────────────┐
│ Current: Dev 60%, Artist 40%        │
│ Propose: Dev 100%                   │
│ Reason: Artist leaving project      │
└──────────────────────────────────────┘
        │
        ▼ (Backend)
┌────────────────────────────────────────────────────┐
│ 1. Call smart contract:                            │
│    split_config::propose_split_config_update(      │
│      project_id=123,                               │
│      new_collaborators=[addr1],                    │
│      new_percentages=[10000],        // 100%       │
│      reason="collaborator_left"                    │
│    )                                                │
│                                                    │
│ 2. Stores as PendingSplitConfig (not active yet)  │
│ 3. Emit event: SplitConfigProposed                │
│ 4. Save proposal in DB for audit                  │
└────────────────────────────────────────────────────┘
        │
        ▼
Creator approves proposal
        │
        ▼ (Backend)
┌────────────────────────────────────────────────────┐
│ 1. Call smart contract:                            │
│    split_config::approve_split_config(             │
│      project_id=123                                │
│    )                                                │
│                                                    │
│ 2. New config becomes active                      │
│ 3. Emit event: SplitConfigActivated               │
│ 4. Old config archived in DB                      │
└────────────────────────────────────────────────────┘
        │
        ▼
✅ Split Updated!
   Future payouts use new 100% split
```

## Payment & Payout Flow

```
CUSTOMER PURCHASE
═══════════════════════════════════════════════════════════════════════

Customer arrives at project page
        │ Sees: "Game $49.99"
        ▼
Clicks "Subscribe/Buy"
        │
        ▼
Redirected to Stripe checkout
        │
        ▼
Customer enters:
├─ Email
├─ Card details
└─ Billing address
        │
        ▼
Stripe processes payment
        │
        ├─ ✅ Success → charge.succeeded webhook
        │
        └─ ❌ Failed → charge.failed webhook

        (Success case →)
        ▼
┌────────────────────────────────────────────────┐
│ Backend receives webhook:                       │
│ POST /api/webhooks/stripe                       │
│ Signature verified ✓                            │
│                                                 │
│ INSERT INTO purchases:                          │
│ - project_id: 1                                 │
│ - customer_email: customer@example.com          │
│ - amount_usdc_micro: 49990000                   │
│ - status: 'pending'                             │
│ - stripe_payment_id: ch_123...                  │
└────────────────────────────────────────────────┘
        │
        ▼
✅ Purchase recorded
   (Customer sees "Thanks for purchasing!")


DAILY BATCH PAYOUT JOB
═══════════════════════════════════════════════════════════════════════

Time: 2:00 AM UTC daily

Cron job triggered: processBatchPayouts()
        │
        ▼
┌──────────────────────────────────────┐
│ Query pending purchases:             │
│ SELECT SUM(amount) BY project_id     │
│ WHERE status = 'pending'             │
│                                      │
│ Example:                             │
│ Project 1: $199.96 (4 purchases)    │
│ Project 2: $99.99 (2 purchases)     │
└──────────────────────────────────────┘
        │
        ▼ (For Project 1)
┌────────────────────────────────────────────────────┐
│ 1. Get collaborators & split config:               │
│    Dev: 60% (addr1)                               │
│    Art: 40% (addr2)                               │
│                                                    │
│ 2. Calculate splits:                              │
│    Total: $199.96                                 │
│    Dev payout: $199.96 × 60% = $119.98            │
│    Art payout: $199.96 × 40% = $79.98             │
│                                                    │
│ 3. Create DB record:                              │
│    INSERT INTO payout_batches                     │
│    (project_id=1, total=199960000, num=2)         │
│    Returns: batch_id=101                          │
└────────────────────────────────────────────────────┘
        │
        ▼
Call on-chain smart contract:
        │
        ▼
┌────────────────────────────────────────────────────┐
│ revenue_splitter::create_payout_batch(             │
│   project_id: 1,                                   │
│   recipients: [addr1, addr2],                      │
│   split_percentages: [6000, 4000],                │
│   total_amount: 199960000                          │
│ )                                                  │
│                                                    │
│ Smart contract:                                    │
│ ✓ Validates percentages sum to 10000              │
│ ✓ Calculates split amounts                        │
│ ✓ Creates PayoutBatch struct                      │
│ ✓ Holds coins in escrow                           │
│ ✓ Returns batch_id=456                            │
│ ✓ Emits PayoutBatchCreated event                  │
└────────────────────────────────────────────────────┘
        │
        ▼
Update DB:
UPDATE payout_batches 
SET on_chain_batch_id=456, status='created'
        │
        ▼
Call execute_payout_batch:
        │
        ▼
┌────────────────────────────────────────────────────┐
│ revenue_splitter::execute_payout_batch(            │
│   batch_id: 456                                    │
│ )                                                  │
│                                                    │
│ Smart contract:                                    │
│ ✓ For each recipient:                             │
│   - Extract coins from escrow                      │
│   - Transfer to wallet (addr1, addr2)              │
│ ✓ Coins debited from treasury                      │
│ ✓ Coins credited to collaborator wallets          │
│ ✓ Emit PayoutBatchExecuted event                  │
└────────────────────────────────────────────────────┘
        │
        ▼
Record payouts immutably on-chain:
        │
        ▼
┌────────────────────────────────────────────────────┐
│ payout_registry::batch_record_payouts(             │
│   batch_id: 456,                                   │
│   recipients: [addr1, addr2],                      │
│   amounts: [119980000, 79980000],                  │
│   statuses: [1, 1],      // 1 = success           │
│   tx_hashes: [0xabc..., 0xdef...]                 │
│ )                                                  │
│                                                    │
│ For each payout:                                   │
│ ✓ Create PayoutRecord (immutable, versioned)      │
│ ✓ Index by recipient address                      │
│ ✓ Index by project_id                             │
│ ✓ Emit PayoutRecorded event                       │
│                                                    │
│ Records created:                                   │
│ - record_id=1001 (addr1, $119.98)                 │
│ - record_id=1002 (addr2, $79.98)                  │
└────────────────────────────────────────────────────┘
        │
        ▼
Sync back to offchain DB:
        │
        ▼
┌────────────────────────────────────────────┐
│ INSERT INTO payout_history                 │
│ (batch_id, recipient_id, amount, ...)      │
│ VALUES                                     │
│ (101, 2, 119980000, on_chain_record=1001), │
│ (101, 3, 79980000, on_chain_record=1002)   │
│                                            │
│ UPDATE purchases                           │
│ SET status='distributed'                   │
│ WHERE project_id=1 AND status='pending'    │
└────────────────────────────────────────────┘
        │
        ▼
✅ Batch Complete!

CREATOR VIEW
═══════════════════════════════════════════════════════════════════════

Creator dashboard shows:
┌────────────────────────────────────┐
│ My Payouts                         │
├────────────────────────────────────┤
│ Project: Game                      │
│ Last 7 Days: $119.98               │
│ Lifetime: $1,234.56                │
├────────────────────────────────────┤
│ Recent Payouts:                    │
│ 2026-04-13: $119.98 ✅ (on-chain) │
│ 2026-04-12: $89.99 ✅  (on-chain) │
├────────────────────────────────────┤
│ [View Wallet] [Withdraw] [History] │
└────────────────────────────────────┘

Creator can:
✓ See exact payout amounts
✓ View on-chain TX hash (proof)
✓ Export payment history (CSV)
✓ Withdraw to bank account
✓ Setup additional wallets
```

## Data Flow Diagram

```
OFFCHAIN ←→ ONCHAIN SYNCHRONIZATION
═══════════════════════════════════════════════════════════════════════

Timeline: Immediate          24 Hours Later       Immutable
        ├──────────────────┼───────────────────┼────────────
        │                  │                   │
        ▼                  ▼                   ▼
    Purchase          Payout Settled        Audit Record
    Created           On Blockchain         Created

OFFCHAIN DB:
Customer buys → Purchase inserted → Status='pending'
   (Real-time        24h later          Forever
    dashboard)     → Status='settled'  [Immutable
    ✓ Show pending    ✓ Dashboard      proof]
      amount            updated

ONCHAIN:
                    Batch created → Batch executed → Record created
                    tx: create_    tx: execute_    tx: record_
                    payout_batch   payout_batch    payouts
                    ✓ In escrow    ✓ Transferred  ✓ Immutable
                    ✓ Verified    ✓ Confirmed     ✓ Indexed


KEY INVARIANTS
═════════════════════════════════════════════════════════════════════════

1. Split Percentages Sum to 100%
   ├─ Enforced on-chain in smart contract
   ├─ Enforced offchain in validation
   └─ Database constraint check

2. All Recipients Have Valid Wallets
   ├─ Validated before batch creation
   └─ Retry with error recovery if fails

3. No Double Payouts
   ├─ Purchase marked 'distributed' after payout
   ├─ Batch immutable after execution
   └─ Idempotent operations

4. Off/On-Chain Amounts Match
   ├─ Same calculation used both places
   ├─ Remainder distributed to first recipient
   └─ Audit trail proves sync
```

## Error Recovery Flow

```
ERROR SCENARIOS & RECOVERY
═════════════════════════════════════════════════════════════════════════

Scenario: Payout batch fails mid-execution
Cause: Some recipients unreachable

Recovery:
1. Record partial success in DB
   INSERT partially successful payouts records
   
2. Retry failed recipients only
   CREATE new batch for failed recipients
   EXECUTE with smaller set
   
3. If still fails:
   - Alert ops team
   - Create manual recovery task
   - Log detailed error

Scenario: Database out of sync with blockchain
Cause: Offchain crash during batch sync

Recovery:
1. Query on-chain events from smart contract
   payout_registry::get_payout_records(batch_id)
   
2. Compare with offchain DB
   SELECT * FROM payout_history WHERE batch_id=456
   
3. Sync missing records
   INSERT missing payout records from blockchain
   
4. Verify totals match
   SUM(onchain) == SUM(offchain)


Scenario: Creator modifies split mid-payout
Status: Old batch executing, new split proposed

Expected behavior:
1. Old batch finishes with old split
2. New split not active until creator approves
3. Next batch uses new split
4. All immutably recorded
```

---

These diagrams represent the complete flow from user signup to creator receiving payment!

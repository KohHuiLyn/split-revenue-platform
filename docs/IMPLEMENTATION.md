# Implementation Guide

## Phase 1: Core Infrastructure (Week 1-2)

### 1.1 Local Dev Setup
```bash
# Install Aptos CLI
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Create test account
aptos init --profile testnet --network testnet

# Verify setup
aptos account balance --profile testnet
```

### 1.2 Database Setup
```bash
# Create database
createdb split_revenue_db

# Apply schema
psql split_revenue_db < database/schema.sql

# Verify tables
psql split_revenue_db -c "\dt"
```

### 1.3 Smart Contract Basics
Currently, the Move contracts are templates. Next steps:
1. Fix import paths in Move.toml
2. Test contracts locally: `aptos move test`
3. Deploy to testnet: `aptos move publish --profile testnet`

## Phase 2: Wallet & Auth (Week 2-3)

### 2.1 Implement User Registration
```typescript
// POST /api/auth/signup
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "securepass123"
}

// Response
{
  "userId": 1,
  "email": "user@example.com",
  "walletAddress": "0x123...",
  "createdAt": "2026-04-13T10:00:00Z"
}
```

**Flow:**
1. Validate email & password
2. Call `generateAndEncryptWallet()` → Get encrypted credentials
3. Create user in DB with encrypted private key
4. Return user info (without private key!)

### 2.2 Implement OAuth
```typescript
// For Google OAuth, use passport.js
// For Discord, similar approach via oauth2-discord
```

## Phase 3: Projects & Splits (Week 3-4)

### 3.1 Create Project Endpoint
```typescript
POST /api/projects
{
  "name": "My Game",
  "description": "Indie game by our team",
  "priceUsdcMicro": 4999000000, // $49.99
  "collaborators": [
    { "email": "dev@example.com", "splitPercentage": 60 },
    { "email": "artist@example.com", "splitPercentage": 40 }
  ]
}

// Response
{
  "projectId": 1,
  "onChainId": 12345,
  "name": "My Game",
  "createdAt": "2026-04-13T10:00:00Z"
}
```

**Flow:**
1. Verify user is authenticated
2. Create project in DB
3. Call `createSplitConfigOnChain()` with collaborator addresses & percentages
4. Save split config version in DB
5. Return project with on-chain reference

### 3.2 Propose Split Config Update
When a collaborator leaves or split needs rebalancing:

```typescript
POST /api/projects/:id/splits/propose
{
  "newCollaborators": [
    { "email": "dev@example.com", "splitPercentage": 100 }
  ],
  "reason": "collaborator_left"
}

// Response
{
  "proposalId": 1,
  "status": "pending_approval",
  "proposedAt": "2026-04-13T10:00:00Z"
}
```

**Flow:**
1. Creator calls proposal endpoint
2. Backend calls `propose_split_config_update()` on-chain
3. Creator must approve: `approve_split_config()` on-chain
4. New config becomes active
5. Future payouts use new percentages

## Phase 4: Payments & Payouts (Week 4-6)

### 4.1 Purchase Webhook (Stripe Integration)
```typescript
// Stripe sends webhook after successful payment
POST /api/webhooks/stripe
{
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_123...",
      "amount": 4999,  // in cents
      "metadata": {
        "projectId": 1,
        "customerEmail": "buyer@example.com"
      }
    }
  }
}
```

**Flow:**
1. Validate webhook signature
2. Convert cents → USDC micro-units
3. Create purchase record in DB
4. Queue for next batch payout window

### 4.2 Automated Batch Payout (Scheduled Job)
Runs daily or weekly:

```typescript
async function processBatchPayouts() {
  // 1. Get all eligible projects with pending purchases
  const projects = await getPendingProjects();

  for (const project of projects) {
    // 2. Get collaborators with current split config
    const collaborators = await getProjectCollaborators(project.id);
    const splitConfig = await getSplitConfigData(project.id);

    // 3. Calculate split amounts
    const totalAmount = await getTotalPendingAmount(project.id);
    const splitAmounts = calculateSplits(totalAmount, splitConfig);

    // 4. Create on-chain batch
    const batchId = await createPayoutBatchOnChain(
      project.id,
      collaborators.map(c => c.walletAddress),
      collaborators.map(c => c.splitPercentage),
      totalAmount
    );

    // 5. Record batch in DB
    await saveBatch({
      projectId: project.id,
      batchId,
      totalAmount,
      status: "created"
    });

    // 6. Execute batch
    const txHash = await executePayoutBatchOnChain(batchId);

    // 7. Record execution
    await recordPayoutOnChain(
      batchId,
      collaborators,
      splitAmounts,
      recipients.map(() => 1),  // status: success
      [txHash]
    );

    // 8. Update batch status
    await updateBatchStatus(batchId, "executed");

    // 9. Mark purchases as distributed
    await markPurchasesDistributed(project.id);
  }
}

// Schedule this to run daily
cron.schedule('0 2 * * *', processBatchPayouts);
```

### 4.3 Payout Verification Endpoint
```typescript
GET /api/payouts/history
{
  "limit": 50,
  "offset": 0
}

// Response
{
  "payouts": [
    {
      "projectId": 1,
      "projectName": "My Game",
      "amount": 49.99,
      "status": "completed",
      "txHash": "0x123...",
      "createdAt": "2026-04-13T10:00:00Z"
    }
  ],
  "total": 150,
  "totalAmount": 7499.50
}
```

## Implementation Checklist

### Backend API
- [ ] User registration (email)
- [ ] OAuth integration (Google/Discord)
- [ ] Project creation
- [ ] Collaborator management
- [ ] Split configuration proposal
- [ ] Split approval workflow
- [ ] Purchase webhook (Stripe)
- [ ] Batch payout orchestration
- [ ] Payout history endpoint
- [ ] Error handling & logging
- [ ] Rate limiting
- [ ] Request validation

### Smart Contracts
- [ ] Fix Move.toml imports
- [ ] Test create_split_config
- [ ] Test propose_split_config_update
- [ ] Test execute_payout_batch
- [ ] Test record_payout
- [ ] Deploy to testnet
- [ ] Verify on Aptos Explorer

### Database
- [ ] Create all tables
- [ ] Add indexes for common queries
- [ ] Set up backups
- [ ] Implement connection pooling

### Security
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] CORS configuration
- [ ] API authentication (JWT)
- [ ] Rate limiting per user
- [ ] Encrypted password storage (bcryptjs)
- [ ] Private key encryption verification
- [ ] Webhook signature validation (Stripe)

### Testing
- [ ] Unit tests for wallet generation
- [ ] Integration tests for auth flow
- [ ] End-to-end test: signup → project → payout
- [ ] Load testing for batch payouts
- [ ] Stress test with many collaborators

## Common Issues & Solutions

### Issue: "Move modules not found"
**Solution:** Ensure Move.toml has correct paths. For a fresh setup, copy framework from Aptos repo:
```bash
cd contracts
git clone https://github.com/aptos-labs/aptos-core.git --depth 1
# Update Move.toml to point to correct framework paths
```

### Issue: Wallet decryption fails
**Solution:** Verify `WALLET_ENCRYPTION_KEY` is consistent. Mismatch between encryption and decryption keys causes failures.

### Issue: Payout batch exceeds gas limits
**Solution:** Reduce batch size. Instead of batching 1000 recipients, try 100. Move contract splits are efficient but there are limits.

### Issue: Database connection timeout
**Solution:** implement connection pooling and retry logic:
```typescript
const pool = postgres({
  max: 20,  // connection pool size
  timeout: 30,  // seconds
});
```

## Performance Tuning

### Database Indexes
Already included in schema.sql. Key indexes:
- `idx_purchases_project_id` - Batch payout queries
- `idx_payout_history_recipient_id` - User payout history
- `idx_projects_on_chain_id` - On-chain → offchain sync

### Smart Contract Gas Optimization
- Batch records in single call: `batch_record_payouts()`
- Avoid repeated state modifications
- Use table for O(1) lookups instead of vector searches

### API Caching
Add Redis for:
- Current split config (TTL: 1 hour)
- Project details (TTL: 1 hour)
- Collaborator lists (TTL: 30 min)

## Deployment Checklist

### Testnet
- [ ] Deploy Move contracts  
- [ ] Set environment variables
- [ ] Run migrations
- [ ] Integration tests pass
- [ ] Manual testing of all flows

### Mainnet (Future)
- [ ] Security audit completed
- [ ] All tests passing on mainnet testnet fork
- [ ] Gradual rollout: 10% users first
- [ ] Monitor for issues
- [ ] Scale to 100%

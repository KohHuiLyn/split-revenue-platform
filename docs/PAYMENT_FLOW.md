# Payment Flow & Payout Strategy

## Complete Purchase-to-Payout Flow

### Step 1: Customer Initiates Purchase

```
┌─────────────────────────────────────────┐
│ Customer arrives at project page        │
│ Displays: Project info + Price in USD   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Customer clicks "Subscribe/Buy"         │
│ Redirected to Stripe checkout           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Stripe processes payment (USDC or fiat) │
│ Amount: $X (converted to USDC)          │
└─────────────┬───────────────────────────┘
              │
              ▼ (Success)
┌─────────────────────────────────────────┐
│ POST /api/webhooks/stripe               │
│ Backend receives charge.succeeded event │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ CREATE purchases record in DB:          │
│ - project_id                            │
│ - customer_email                        │
│ - amount_usdc_micro (e.g., 49.99 USD)  │
│ - status: "pending"                     │
│ - stripe_payment_id: "ch_..."           │
└─────────────────────────────────────────┘
```

**Database state after purchase:**
```sql
INSERT INTO purchases (project_id, customer_id, amount_usdc_micro, status)
VALUES (1, 5, 49990000, 'pending');
-- (49.99 USD = 49,990,000 micro-USDC)
```

### Step 2: Batch Aggregation (Daily/Weekly)

A scheduled job runs every 24 hours:

```
Time: 2:00 AM UTC
┌─────────────────────────────────────────────────┐
│ Cron Job Triggered: processBatchPayouts()       │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Query all projects with pending purchases       │
│ SELECT project_id, SUM(amount) FROM purchases   │
│   WHERE status = 'pending'                      │
│   GROUP BY project_id                           │
└────────────┬────────────────────────────────────┘
             │
             ▼ (For each project)
┌─────────────────────────────────────────────────┐
│ Get current split config from DB:               │
│ - collaborators: [addr1, addr2]                 │
│ - split_percentages: [5000, 5000]  (50/50)     │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Calculate split amounts:                        │
│ total = $99.98 (two purchases)                 │
│ recipient1 = $99.98 × 50% = $49.99             │
│ recipient2 = $99.98 × 50% = $49.99             │
│                                                 │
│ In micro-USDC:                                  │
│ recipient1 = 49,990,000                         │
│ recipient2 = 49,990,000                         │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ CREATE payout_batches record (offchain)         │
│ INSERT INTO payout_batches                      │
│   (project_id, total_amount_usdc_micro,         │
│    num_recipients, status)                      │
│ VALUES (1, 99980000, 2, 'pending')              │
│ Returns: batch_id = 101                         │
└────────────┬────────────────────────────────────┘
```

### Step 3: On-Chain Batch Execution

```
┌─────────────────────────────────────────────────┐
│ Call createPayoutBatchOnChain():                │
│ Module: Splitr::revenue_splitter     │
│                                                 │
│ Arguments:                                      │
│   project_id: 1                                 │
│   recipients: [0x123..., 0x456...]             │
│   split_percentages: [5000, 5000]              │
│   total_amount: 99,980,000                      │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Smart Contract: revenue_splitter::               │
│   create_payout_batch()                         │
│                                                 │
│ 1. Validate percentages sum to 10000 ✓         │
│ 2. Calculate split amounts (handles rounding)  │
│ 3. Create PayoutBatch struct                   │
│ 4. Store coins in escrow                       │
│ 5. Emit PayoutBatchCreated event               │
│ 6. Return batch_id = 123                       │
└────────────┬────────────────────────────────────┘
             │
             ▼ (Transaction Hash: 0xabc...)
┌─────────────────────────────────────────────────┐
│ UPDATE payout_batches SET                       │
│   on_chain_batch_id = 123,                      │
│   status = 'created'                            │
│ WHERE id = 101                                  │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Call executePayoutBatchOnChain(batch_id=123):  │
│                                                 │
│ 1. Verify batch exists and is pending          │
│ 2. For each recipient:                          │
│    - Calculate payout amount                    │
│    - Extract coins from escrow                  │
│    - Transfer to recipient wallet               │
│ 3. Emit PayoutBatchExecuted event              │
│ 4. Mark batch as executed                       │
└────────────┬────────────────────────────────────┘
             │
             ▼ (Transaction Hash: 0xdef...)
┌─────────────────────────────────────────────────┐
│ UPDATE payout_batches SET                       │
│   status = 'executed',                          │
│   executed_at = NOW()                           │
│ WHERE on_chain_batch_id = 123                   │
└────────────┬────────────────────────────────────┘
```

### Step 4: Payout Recording (Immutable Audit Trail)

After on-chain execution succeeds:

```
┌─────────────────────────────────────────────────┐
│ Call recordPayoutOnChain()                      │
│ Module: Splitr::payout_registry      │
│                                                 │
│ Arguments (batch of payouts):                   │
│   batch_id: 123                                 │
│   project_id: 1                                 │
│   recipients: [0x123..., 0x456...]             │
│   amounts: [49990000, 49990000]                 │
│   statuses: [1, 1]  (1 = success)              │
│   tx_hashes: [0xdef..., 0xdef...]              │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Smart Contract: payout_registry::                │
│   batch_record_payouts()                        │
│                                                 │
│ For each recipient:                             │
│ 1. Create PayoutRecord struct (immutable)       │
│ 2. Store in payment records table               │
│ 3. Index by recipient_address                   │
│ 4. Index by project_id                          │
│ 5. Emit PayoutRecorded event                    │
│                                                 │
│ Result: 2 PayoutRecords created                 │
│   - record_id: 1001                             │
│   - record_id: 1002                             │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ Offchain sync: Call recordPayoutResults()       │
│                                                 │
│ INSERT INTO payout_history (batch_id, ...)      │
│ VALUES                                          │
│   (101, 123, project_id=1, recipient_id=2,     │
│    amount=49990000, on_chain_record_id=1001),  │
│   (101, 123, project_id=1, recipient_id=3,     │
│    amount=49990000, on_chain_record_id=1002)   │
│                                                 │
│ UPDATE purchases                                │
│ SET status = 'distributed'                      │
│ WHERE project_id = 1 AND status = 'pending'    │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│ ✅ Complete! Payouts are now:                   │
│    - In recipients' wallets (on-chain)          │
│    - Recorded in audit trail (immutable)        │
│    - Synced to offchain DB                      │
│    - Visible to creators in dashboard           │
└─────────────────────────────────────────────────┘
```

## Gas Optimization Strategy

### Why Batch?

**Scenario A: Pay immediately per purchase**
```
5 purchases in 1 hour
→ 5 separate "execute_payout" transactions
→ Gas cost: ~5 × 50,000 units = 250,000 units
→ Cost per creator: ~$0.10-0.50/payout ❌
```

**Scenario B: Batch daily**
```
100 purchases → 1 batch payout transaction
→ Gas cost: ~100,000 units (single call)
→ Cost per creator: ~$0.01/payout ✅
→ Savings: 90%+ reduction
```

### Implementation

```typescript
// Batching Algorithm
async function processBatchPayouts() {
  const BATCH_INTERVAL_HOURS = 24;
  const MAX_RECIPIENTS_PER_BATCH = 100; // Adjust based on gas limits

  const projects = await getProjectsWithPendingPurchases();

  for (const project of projects) {
    let offset = 0;
    
    while (true) {
      // Get next batch of collaborators
      const collaborators = await getProjectCollaborators(
        project.id,
        offset,
        MAX_RECIPIENTS_PER_BATCH
      );

      if (!collaborators.length) break;

      // Process this batch
      const totalAmount = await getTotalPendingAmount(
        project.id,
        collaborators.map(c => c.id)
      );

      await processBatch(project.id, collaborators, totalAmount);

      offset += MAX_RECIPIENTS_PER_BATCH;
    }
  }
}

// If a project has 500 collaborators:
// Processed in 5 transactions (100 per call)
// Much cheaper than 500 individual transfers
```

## Error Handling & Retries

### Failed Payout Recovery

```typescript
async function handleFailedBatch(batchId: number) {
  const batch = await getPayoutBatch(batchId);

  if (batch.status === 'failed') {
    // 1. Check what failed
    const failedPayouts = await getFailedPayouts(batchId);

    // 2. Retry logic
    if (failedPayouts.length > 0) {
      // Option A: Retry entire batch (if all failed)
      if (failedPayouts.length === batch.num_recipients) {
        await executePayoutBatchOnChain(batch.on_chain_batch_id);
      }
      // Option B: Create new batch for failed recipients
      else {
        await createNewBatchForFailed(failedPayouts);
      }
    }

    // 3. Alert team if manual intervention needed
    if (retryAttempts > MAX_RETRIES) {
      notifyOps('Batch ' + batchId + ' failed after max retries');
    }
  }
}
```

## Off-Chain/On-Chain Sync

### Why Both Points of Truth?

| Aspect | Offchain | Onchain |
|--------|----------|---------|
| **Read Speed** | Fast (indexed DB) | Slow (blockchain) |
| **Write Speed** | Instant | 1-2 minutes |
| **Real-time UI** | ✅ (show pending) | ❌ (delay) |
| **Immutability** | ❌ (mutable) | ✅ (permanent) |
| **Audit** | Good | Perfect |
| **Dispute Proof** | Weak | Strong |

### Sync Strategy

```typescript
// Offchain: Immediately record purchase
await db.purchases.insert({
  project_id: 1,
  amount: 49.99,
  status: 'pending'  // Visible to creator immediately
});

// Onchain: Record after batch settles (2-24 hours later)
const onChainRecord = await payout_registry.record_payout(
  batchId,
  project_id,
  recipient,
  amount,
  tx_hash
);

// Sync back to offchain for immutable reference
await db.payout_history.update({
  on_chain_record_id: onChainRecord.record_id,
  on_chain_tx_hash: onChainRecord.tx_hash
});
```

## Creator Experience

### Dashboard View

```
My Payouts
═══════════════════════════════════════════

Project: My Game
├─ Last 7 Days: $249.95
├─ This Month: $1,249.95
└─ All Time: $12,499.50

Recent Payouts:
┌─────────────────────────────────────────┐
│ Date        | Amount | Status | Hash    │
├─────────────────────────────────────────┤
│ 2026-04-13  | $49.99 | ✅     | [View] │
│ 2026-04-12  | $24.99 | ⏳     | [View] │  <- In batch, settling
│ 2026-04-11  | $99.99 | ✅     | [View] │
└─────────────────────────────────────────┘

[View Wallet] [Withdraw to Bank] [Export CSV]
```

## Troubleshooting

### Issue: Batch Processing Delayed
**Symptoms:** Purchases show "pending" for >24 hours

**Cause:** 
- Cron job not running
- Database connection timeout
- Insufficient gas in admin wallet

**Solution:**
```bash
# Check cron job
ps aux | grep node

# Verify admin wallet balance
aptos account balance --account <admin_address>

# Manually trigger
curl -X POST http://localhost:3000/admin/payouts/force-batch
```

### Issue: Some Recipients Don't Receive Payout
**Symptoms:** Recipient A gets payment, Recipient B doesn't

**Cause:**
- Recipient account not initialized on-chain
- Incorrect wallet address in split config
- Insufficient gas for multi-recipient transfer

**Solution:**
```typescript
// Ensure all recipients exist on-chain
await ensureRecipientInitialized(recipientAddress);

// Re-run batch only for failed recipients
await retryFailedPayouts(batchId);
```

### Issue: Different Off-Chain and On-Chain Amounts
**Symptoms:** Dashboard shows $100, blockchain shows 99.99

**Cause:** Rounding errors in split calculation

**Solution:**
- Always convert amounts carefully
- Add tests for rounding with odd numbers
- Assign remainder to first recipient

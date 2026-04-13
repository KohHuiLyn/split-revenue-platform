module SplitRevenueAdmin::revenue_splitter {
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;

    // We'll support USDC - for now using AptosCoin as placeholder
    // In production, use the actual USDC coin type

    /// Represents a pending payout batch
    struct PayoutBatch has key, store {
        batch_id: u64,
        project_id: u64,
        total_amount: u64, // in micro-units (e.g., 1 USDC = 1,000,000 micro-units)
        split_amounts: vector<u64>, // amounts for each collaborator
        recipients: vector<address>, // parallel to split_amounts
        batch_created_at: u64,
        batch_executed_at: u64, // 0 if not yet executed
        status: u8, // 0: pending, 1: executed, 2: failed
        coins_held: Coin<AptosCoin>, // coins in escrow
    }

    /// Registry of all payout batches
    struct PayoutRegistry has key {
        batches: Table<u64, PayoutBatch>, // batch_id -> PayoutBatch
        next_batch_id: u64,
    }

    /// Events
    struct PayoutBatchCreated has drop, store {
        batch_id: u64,
        project_id: u64,
        total_amount: u64,
        num_recipients: u64,
        created_at: u64,
    }

    struct PayoutBatchExecuted has drop, store {
        batch_id: u64,
        project_id: u64,
        total_amount: u64,
        num_recipients: u64,
        executed_at: u64,
    }

    struct PayoutRecipient has drop, store {
        recipient: address,
        amount: u64,
    }

    const EINVALID_SPLIT: u64 = 1;
    const EINSUFFICIENT_FUNDS: u64 = 2;
    const EBATCH_ALREADY_EXECUTED: u64 = 3;
    const EBATCH_NOT_FOUND: u64 = 4;

    /// Initialize the payout registry (admin function)
    public fun init_registry(admin: &signer) {
        let addr = signer::address_of(admin);
        move_to(admin, PayoutRegistry {
            batches: table::new(),
            next_batch_id: 1,
        });
    }

    /// Create a new payout batch
    /// Called by backend when collecting payment from customer
    public fun create_payout_batch(
        admin: &signer,
        project_id: u64,
        recipients: vector<address>,
        split_percentages: vector<u64>,
        total_amount: u64,
        coins: Coin<AptosCoin>,
    ) acquires PayoutRegistry {
        let admin_addr = signer::address_of(admin);

        // Validate inputs
        assert!(
            vector::length(&recipients) == vector::length(&split_percentages),
            EINVALID_SPLIT
        );
        assert!(coin::value(&coins) == total_amount, EINSUFFICIENT_FUNDS);

        // Calculate split amounts
        let split_amounts = vector::empty();
        let i = 0;
        let sum = 0u64;

        while (i < vector::length(&split_percentages)) {
            let percentage = *vector::borrow(&split_percentages, i);
            let amount = (((total_amount as u128) * (percentage as u128)) / 10000u128) as u64;
            vector::push_back(&mut split_amounts, amount);
            sum = sum + amount;
            i = i + 1;
        };

        // Handle rounding - add remainder to first recipient
        if (sum < total_amount) {
            let remainder = total_amount - sum;
            let first_amount = vector::borrow_mut(&mut split_amounts, 0);
            *first_amount = *first_amount + remainder;
        };

        let registry = borrow_global_mut<PayoutRegistry>(@SplitRevenueAdmin);
        let batch_id = registry.next_batch_id;
        registry.next_batch_id = batch_id + 1;

        let now = timestamp::now_seconds();
        let batch = PayoutBatch {
            batch_id,
            project_id,
            total_amount,
            split_amounts,
            recipients: recipients,
            batch_created_at: now,
            batch_executed_at: 0,
            status: 0, // pending
            coins_held: coins,
        };

        table::add(&mut registry.batches, batch_id, batch);

        event::emit(PayoutBatchCreated {
            batch_id,
            project_id,
            total_amount,
            num_recipients: vector::length(&recipients),
            created_at: now,
        });
    }

    /// Execute payout batch (distribute coins to recipients)
    public fun execute_payout_batch(
        admin: &signer,
        batch_id: u64,
    ) acquires PayoutRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<PayoutRegistry>(@SplitRevenueAdmin);

        assert!(table::contains(&registry.batches, batch_id), EBATCH_NOT_FOUND);

        let batch = table::borrow_mut(&mut registry.batches, batch_id);
        assert!(batch.status == 0, EBATCH_ALREADY_EXECUTED); // must be pending

        let i = 0;
        let recipients_paid = vector::empty();

        // Extract coins and split
        let total_coins = coin::withdraw(&mut batch.coins_held, batch.total_amount);

        while (i < vector::length(&batch.recipients)) {
            let recipient = *vector::borrow(&batch.recipients, i);
            let amount = *vector::borrow(&batch.split_amounts, i);

            // Split the coin and send to recipient
            let payout_coin = coin::extract(&mut total_coins, amount);
            coin::deposit(recipient, payout_coin);

            vector::push_back(&mut recipients_paid, PayoutRecipient {
                recipient,
                amount,
            });

            i = i + 1;
        };

        // Destroy any remaining coins (should be 0)
        coin::destroy_zero(total_coins);

        batch.status = 1; // executed
        batch.batch_executed_at = timestamp::now_seconds();

        event::emit(PayoutBatchExecuted {
            batch_id,
            project_id: batch.project_id,
            total_amount: batch.total_amount,
            num_recipients: vector::length(&batch.recipients),
            executed_at: batch.batch_executed_at,
        });
    }

    /// Get batch details
    public fun get_batch(batch_id: u64): (u64, u64, u64, u8) acquires PayoutRegistry {
        let registry = borrow_global<PayoutRegistry>(@SplitRevenueAdmin);
        let batch = table::borrow(&registry.batches, batch_id);
        (batch.project_id, batch.total_amount, batch.batch_created_at, batch.status)
    }
}

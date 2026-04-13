module SplitRevenueAdmin::payout_registry {
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    /// Immutable record of a single payout execution
    struct PayoutRecord has key, store {
        record_id: u64,
        batch_id: u64,
        project_id: u64,
        recipient: address,
        amount: u64, // in micro-units
        execution_timestamp: u64,
        transaction_hash: vector<u8>, // Store hash in UTF-8
        status: u8, // 0: pending, 1: success, 2: failed
    }

    /// Registry of all payout records
    struct PayoutRecordRegistry has key {
        records: Table<u64, PayoutRecord>, // record_id -> PayoutRecord
        recipient_records: Table<address, vector<u64>>, // recipient -> list of record_ids
        project_records: Table<u64, vector<u64>>, // project_id -> list of record_ids
        next_record_id: u64,
    }

    /// Summary of payouts to a recipient
    struct RecipientPayoutSummary has drop, store {
        recipient: address,
        total_amount_paid: u64,
        num_payouts: u64,
        last_payout_time: u64,
    }

    /// Events
    struct PayoutRecorded has drop, store {
        record_id: u64,
        batch_id: u64,
        project_id: u64,
        recipient: address,
        amount: u64,
        status: u8,
        recorded_at: u64,
    }

    const ERECORD_NOT_FOUND: u64 = 1;

    /// Initialize the payout record registry (admin function)
    public fun init_registry(admin: &signer) {
        let addr = signer::address_of(admin);
        move_to(admin, PayoutRecordRegistry {
            records: table::new(),
            recipient_records: table::new(),
            project_records: table::new(),
            next_record_id: 1,
        });
    }

    /// Record a payout execution (called after successful payout batch execution)
    public fun record_payout(
        admin: &signer,
        batch_id: u64,
        project_id: u64,
        recipient: address,
        amount: u64,
        status: u8, // 0: pending, 1: success, 2: failed
        tx_hash: vector<u8>,
    ) acquires PayoutRecordRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<PayoutRecordRegistry>(@SplitRevenueAdmin);

        let record_id = registry.next_record_id;
        registry.next_record_id = record_id + 1;

        let now = timestamp::now_seconds();
        let record = PayoutRecord {
            record_id,
            batch_id,
            project_id,
            recipient,
            amount,
            execution_timestamp: now,
            transaction_hash: tx_hash,
            status,
        };

        // Add to main records
        table::add(&mut registry.records, record_id, record);

        // Add to recipient index
        if (!table::contains(&registry.recipient_records, recipient)) {
            table::add(&mut registry.recipient_records, recipient, vector::empty());
        };
        vector::push_back(
            table::borrow_mut(&mut registry.recipient_records, recipient),
            record_id
        );

        // Add to project index
        if (!table::contains(&registry.project_records, project_id)) {
            table::add(&mut registry.project_records, project_id, vector::empty());
        };
        vector::push_back(
            table::borrow_mut(&mut registry.project_records, project_id),
            record_id
        );

        event::emit(PayoutRecorded {
            record_id,
            batch_id,
            project_id,
            recipient,
            amount,
            status,
            recorded_at: now,
        });
    }

    /// Get a specific payout record
    public fun get_payout_record(record_id: u64): (u64, address, u64, u64, u8) acquires PayoutRecordRegistry {
        let registry = borrow_global<PayoutRecordRegistry>(@SplitRevenueAdmin);
        assert!(table::contains(&registry.records, record_id), ERECORD_NOT_FOUND);

        let record = table::borrow(&registry.records, record_id);
        (record.batch_id, record.recipient, record.amount, record.execution_timestamp, record.status)
    }

    /// Batch record payouts for a list of recipients
    public fun batch_record_payouts(
        admin: &signer,
        batch_id: u64,
        project_id: u64,
        recipients: vector<address>,
        amounts: vector<u64>,
        statuses: vector<u8>,
        tx_hashes: vector<vector<u8>>,
    ) acquires PayoutRecordRegistry {
        assert!(
            vector::length(&recipients) == vector::length(&amounts),
            1
        );
        assert!(
            vector::length(&recipients) == vector::length(&statuses),
            1
        );
        assert!(
            vector::length(&recipients) == vector::length(&tx_hashes),
            1
        );

        let i = 0;
        while (i < vector::length(&recipients)) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&amounts, i);
            let status = *vector::borrow(&statuses, i);
            let tx_hash = *vector::borrow(&tx_hashes, i);

            record_payout(admin, batch_id, project_id, recipient, amount, status, tx_hash);
            i = i + 1;
        };
    }

    /// Get all payout records for a project (pagination needed for large projects)
    public fun get_project_payout_records(project_id: u64): vector<u64> acquires PayoutRecordRegistry {
        let registry = borrow_global<PayoutRecordRegistry>(@SplitRevenueAdmin);
        if (table::contains(&registry.project_records, project_id)) {
            *table::borrow(&registry.project_records, project_id)
        } else {
            vector::empty()
        }
    }

    /// Get all payout records for a recipient
    public fun get_recipient_payout_records(recipient: address): vector<u64> acquires PayoutRecordRegistry {
        let registry = borrow_global<PayoutRecordRegistry>(@SplitRevenueAdmin);
        if (table::contains(&registry.recipient_records, recipient)) {
            *table::borrow(&registry.recipient_records, recipient)
        } else {
            vector::empty()
        }
    }
}

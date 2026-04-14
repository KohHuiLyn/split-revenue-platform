module Splitr::payout_registry_tests {
    use aptos_framework::timestamp;
    use std::vector;
    use Splitr::payout_registry;

    #[test(aptos_framework = @0x1, admin = @0xcafe)]
    fun test_record_and_query_single_payout(aptos_framework: signer, admin: signer) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        payout_registry::init_registry(&admin);

        payout_registry::record_payout(
            &admin,
            10,
            22,
            @0xA,
            1_000,
            1,
            b"tx-1",
        );

        let (batch_id, recipient_addr, amount, _exec_time, status) =
            payout_registry::get_payout_record(1);
        assert!(batch_id == 10, 200);
        assert!(recipient_addr == @0xA, 201);
        assert!(amount == 1_000, 202);
        assert!(status == 1, 203);

        let project_records = payout_registry::get_project_payout_records(22);
        let recipient_records = payout_registry::get_recipient_payout_records(@0xA);
        assert!(vector::length(&project_records) == 1, 204);
        assert!(vector::length(&recipient_records) == 1, 205);
        assert!(*vector::borrow(&project_records, 0) == 1, 206);
        assert!(*vector::borrow(&recipient_records, 0) == 1, 207);
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe)]
    fun test_batch_record_payouts(aptos_framework: signer, admin: signer) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        payout_registry::init_registry(&admin);

        payout_registry::batch_record_payouts(
            &admin,
            55,
            8,
            vector[@0xA, @0xB],
            vector[250, 750],
            vector[1, 1],
            vector[b"tx-a", b"tx-b"],
        );

        let project_records = payout_registry::get_project_payout_records(8);
        assert!(vector::length(&project_records) == 2, 220);
        assert!(*vector::borrow(&project_records, 0) == 1, 221);
        assert!(*vector::borrow(&project_records, 1) == 2, 222);

        let (batch_id_1, recipient_1, amount_1, _, status_1) = payout_registry::get_payout_record(1);
        let (batch_id_2, recipient_2, amount_2, _, status_2) = payout_registry::get_payout_record(2);
        assert!(batch_id_1 == 55, 223);
        assert!(batch_id_2 == 55, 224);
        assert!(recipient_1 == @0xA, 225);
        assert!(recipient_2 == @0xB, 226);
        assert!(amount_1 == 250, 227);
        assert!(amount_2 == 750, 228);
        assert!(status_1 == 1, 229);
        assert!(status_2 == 1, 230);
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe)]
    #[expected_failure(abort_code = 1, location = Splitr::payout_registry)]
    fun test_get_missing_record_fails(aptos_framework: signer, admin: signer) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        payout_registry::init_registry(&admin);
        payout_registry::get_payout_record(99);
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe)]
    #[expected_failure(abort_code = 1, location = Splitr::payout_registry)]
    fun test_batch_record_rejects_length_mismatch(aptos_framework: signer, admin: signer) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        payout_registry::init_registry(&admin);

        payout_registry::batch_record_payouts(
            &admin,
            1,
            1,
            vector[@0xA, @0xB],
            vector[500],
            vector[1, 1],
            vector[b"tx-a", b"tx-b"],
        );
    }
}

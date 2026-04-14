module Splitr::split_config_tests {
    use aptos_framework::timestamp;
    use std::signer;
    use std::vector;
    use Splitr::split_config;

    const PROJECT_ID: u64 = 7;

    #[test(aptos_framework = @0x1, admin = @0xcafe, creator = @0xA, collaborator_a = @0xB, collaborator_b = @0xC)]
    fun test_create_and_read_split_config(
        aptos_framework: signer,
        admin: signer,
        creator: signer,
        collaborator_a: signer,
        collaborator_b: signer,
    ) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        split_config::init_registry(&admin);

        let collaborators = vector[
            signer::address_of(&collaborator_a),
            signer::address_of(&collaborator_b),
        ];
        let split_percentages = vector[6000, 4000];
        let treasury = @0xD;

        split_config::create_split_config(
            &creator,
            PROJECT_ID,
            collaborators,
            split_percentages,
            treasury,
        );

        assert!(split_config::has_split_config(PROJECT_ID), 100);
        assert!(
            split_config::get_split_editor(PROJECT_ID) == signer::address_of(&creator),
            101
        );
        assert!(split_config::get_treasury_address(PROJECT_ID) == treasury, 102);

        let (stored_collaborators, stored_splits, is_active) =
            split_config::get_split_config(PROJECT_ID);
        assert!(is_active, 103);
        assert!(vector::length(&stored_collaborators) == 2, 104);
        assert!(vector::length(&stored_splits) == 2, 105);
        assert!(*vector::borrow(&stored_splits, 0) == 6000, 106);
        assert!(*vector::borrow(&stored_splits, 1) == 4000, 107);
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe, creator = @0xA, collaborator = @0xB)]
    #[expected_failure(abort_code = 1, location = Splitr::split_config)]
    fun test_create_split_config_rejects_invalid_total_bps(
        aptos_framework: signer,
        admin: signer,
        creator: signer,
        collaborator: signer,
    ) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        split_config::init_registry(&admin);
        split_config::create_split_config(
            &creator,
            PROJECT_ID,
            vector[signer::address_of(&collaborator)],
            vector[9999],
            @0xD,
        );
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe, creator = @0xA, collaborator = @0xB)]
    #[expected_failure(abort_code = 4, location = Splitr::split_config)]
    fun test_create_split_config_rejects_length_mismatch(
        aptos_framework: signer,
        admin: signer,
        creator: signer,
        collaborator: signer,
    ) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        split_config::init_registry(&admin);
        split_config::create_split_config(
            &creator,
            PROJECT_ID,
            vector[signer::address_of(&collaborator)],
            vector[5000, 5000],
            @0xD,
        );
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe, creator = @0xA, collaborator = @0xB)]
    fun test_propose_and_approve_updates_split(
        aptos_framework: signer,
        admin: signer,
        creator: signer,
        collaborator: signer,
    ) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        split_config::init_registry(&admin);
        split_config::create_split_config(
            &creator,
            PROJECT_ID,
            vector[signer::address_of(&creator), signer::address_of(&collaborator)],
            vector[5000, 5000],
            @0xD,
        );

        split_config::propose_split_config_update(
            &collaborator,
            PROJECT_ID,
            vector[signer::address_of(&creator), signer::address_of(&collaborator)],
            vector[7000, 3000],
            b"rebalance",
        );
        split_config::approve_split_config(&creator, PROJECT_ID);

        let (_, updated_splits, is_active) = split_config::get_split_config(PROJECT_ID);
        assert!(is_active, 120);
        assert!(*vector::borrow(&updated_splits, 0) == 7000, 121);
        assert!(*vector::borrow(&updated_splits, 1) == 3000, 122);
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe, creator = @0xA, proposer = @0xB, outsider = @0xE)]
    #[expected_failure(abort_code = 2, location = Splitr::split_config)]
    fun test_approve_requires_editor(
        aptos_framework: signer,
        admin: signer,
        creator: signer,
        proposer: signer,
        outsider: signer,
    ) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        split_config::init_registry(&admin);
        split_config::create_split_config(
            &creator,
            PROJECT_ID,
            vector[signer::address_of(&creator), signer::address_of(&proposer)],
            vector[5000, 5000],
            @0xD,
        );

        split_config::propose_split_config_update(
            &proposer,
            PROJECT_ID,
            vector[signer::address_of(&creator), signer::address_of(&proposer)],
            vector[6000, 4000],
            b"update",
        );

        split_config::approve_split_config(&outsider, PROJECT_ID);
    }

    #[test(aptos_framework = @0x1, admin = @0xcafe, creator = @0xA)]
    #[expected_failure(abort_code = 3, location = Splitr::split_config)]
    fun test_approve_fails_without_pending(aptos_framework: signer, admin: signer, creator: signer) {
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1);
        split_config::init_registry(&admin);
        split_config::create_split_config(
            &creator,
            PROJECT_ID,
            vector[signer::address_of(&creator)],
            vector[10000],
            @0xD,
        );

        split_config::approve_split_config(&creator, PROJECT_ID);
    }
}

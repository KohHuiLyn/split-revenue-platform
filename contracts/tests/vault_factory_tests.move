module Splitr::vault_factory_tests {
    use Splitr::vault_factory;
    use std::signer;

    #[test]
    fun test_factory_is_not_initialized_by_default() {
        assert!(!vault_factory::is_initialized(), 300);
    }

    #[test(editor = @0xA)]
    #[expected_failure(abort_code = 1, location = Splitr::vault_factory)]
    fun test_create_vault_fails_when_factory_not_initialized(editor: signer) {
        vault_factory::create_vault(
            &editor,
            1,
            vector[signer::address_of(&editor)],
            vector[10000],
        );
    }

    #[test(payer = @0xA)]
    #[expected_failure(abort_code = 1, location = Splitr::vault_factory)]
    fun test_deposit_fails_when_factory_not_initialized(payer: signer) {
        vault_factory::deposit_revenue(&payer, 1, 100);
    }

    #[test(editor = @0xA)]
    #[expected_failure(abort_code = 1, location = Splitr::vault_factory)]
    fun test_execute_payout_fails_when_factory_not_initialized(editor: signer) {
        vault_factory::execute_payout(&editor, 1, 100, b"tx");
    }

    #[test]
    #[expected_failure(abort_code = 1, location = Splitr::vault_factory)]
    fun test_getters_fail_when_factory_not_initialized() {
        vault_factory::get_vault_balance(1);
    }

    #[test]
    #[expected_failure(abort_code = 1, location = Splitr::vault_factory)]
    fun test_metadata_getter_fails_when_factory_not_initialized() {
        vault_factory::get_usdc_metadata_address();
    }
}

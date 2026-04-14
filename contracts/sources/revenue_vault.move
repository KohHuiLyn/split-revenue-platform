module Splitr::revenue_vault {
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::object;
    use aptos_framework::object::ExtendRef;
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleAsset};
    use aptos_framework::primary_fungible_store;

    friend Splitr::vault_factory;

    /// Project-scoped vault backed by an object-controlled primary fungible store.
    struct RevenueVault has store {
        project_id: u64,
        vault_address: address,
        vault_extend_ref: ExtendRef,
        total_deposited: u64,
        total_distributed: u64,
        created_at: u64,
        last_updated_at: u64,
    }

    const EINVALID_SPLIT: u64 = 1;
    const EINSUFFICIENT_VAULT_BALANCE: u64 = 2;
    const EEMPTY_RECIPIENTS: u64 = 3;

    /// Internal vault constructor used by the factory.
    public(friend) fun new(project_id: u64): RevenueVault {
        let now = timestamp::now_seconds();
        let constructor_ref = object::create_object(@Splitr);
        let vault_address = object::address_from_constructor_ref(&constructor_ref);
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);

        RevenueVault {
            project_id,
            vault_address,
            vault_extend_ref,
            total_deposited: 0,
            total_distributed: 0,
            created_at: now,
            last_updated_at: now,
        }
    }

    /// Internal vault deposit helper for a primary store-based fungible asset.
    public(friend) fun deposit(
        vault: &mut RevenueVault,
        payer: &signer,
        usdc_metadata: object::Object<Metadata>,
        amount: u64,
    ) {
        let fa = primary_fungible_store::withdraw(payer, usdc_metadata, amount);
        primary_fungible_store::deposit(vault.vault_address, fa);
        vault.total_deposited = vault.total_deposited + amount;
        vault.last_updated_at = timestamp::now_seconds();
    }

    /// Internal vault distribution helper. Remainder is assigned to index 0.
    public(friend) fun distribute(
        vault: &mut RevenueVault,
        usdc_metadata: object::Object<Metadata>,
        recipients: &vector<address>,
        split_bps: &vector<u64>,
        payout_amount: u64,
    ): vector<u64> {
        assert!(vector::length(recipients) > 0, EEMPTY_RECIPIENTS);
        assert!(vector::length(recipients) == vector::length(split_bps), EINVALID_SPLIT);
        assert!(
            primary_fungible_store::balance(vault.vault_address, usdc_metadata) >= payout_amount,
            EINSUFFICIENT_VAULT_BALANCE
        );

        let i = 0;
        let bps_total = 0u64;
        while (i < vector::length(split_bps)) {
            bps_total = bps_total + *vector::borrow(split_bps, i);
            i = i + 1;
        };
        assert!(bps_total == 10000, EINVALID_SPLIT);

        let split_amounts = vector::empty<u64>();
        let j = 0;
        let distributed_sum = 0u64;
        while (j < vector::length(split_bps)) {
            let bps = *vector::borrow(split_bps, j);
            let amount = (((payout_amount as u128) * (bps as u128)) / 10000u128) as u64;
            vector::push_back(&mut split_amounts, amount);
            distributed_sum = distributed_sum + amount;
            j = j + 1;
        };

        if (distributed_sum < payout_amount) {
            let remainder = payout_amount - distributed_sum;
            let first_amount = vector::borrow_mut(&mut split_amounts, 0);
            *first_amount = *first_amount + remainder;
        };

        let vault_signer = object::generate_signer_for_extending(&vault.vault_extend_ref);
        let payout_fa = primary_fungible_store::withdraw(&vault_signer, usdc_metadata, payout_amount);
        distribute_fungible_asset(payout_fa, recipients, &split_amounts);

        vault.total_distributed = vault.total_distributed + payout_amount;
        vault.last_updated_at = timestamp::now_seconds();
        split_amounts
    }

    fun distribute_fungible_asset(
        payout_fa: FungibleAsset,
        recipients: &vector<address>,
        split_amounts: &vector<u64>,
    ) {
        let i = 0;
        while (i < vector::length(recipients)) {
            let recipient = *vector::borrow(recipients, i);
            let amount = *vector::borrow(split_amounts, i);
            let payout_piece = fungible_asset::extract(&mut payout_fa, amount);
            primary_fungible_store::deposit(recipient, payout_piece);
            i = i + 1;
        };
        fungible_asset::destroy_zero(payout_fa);
    }

    public(friend) fun get_balance(
        vault: &RevenueVault,
        usdc_metadata: object::Object<Metadata>,
    ): u64 {
        primary_fungible_store::balance(vault.vault_address, usdc_metadata)
    }

    public(friend) fun get_totals(vault: &RevenueVault): (u64, u64) {
        (vault.total_deposited, vault.total_distributed)
    }

    public(friend) fun get_project_id(vault: &RevenueVault): u64 {
        vault.project_id
    }

    public(friend) fun get_vault_address(vault: &RevenueVault): address {
        vault.vault_address
    }
}

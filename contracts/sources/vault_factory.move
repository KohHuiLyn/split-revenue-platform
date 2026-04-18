module Splitr::vault_factory {
    use std::signer;
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::object;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::primary_fungible_store;
    use Splitr::split_config;
    use Splitr::revenue_vault::{Self, RevenueVault};
    use Splitr::payout_registry;

    struct VaultFactory has key {
        usdc_metadata: object::Object<Metadata>,
        vaults: Table<u64, RevenueVault>,
        next_payout_id: u64,
    }

    #[event]
    struct VaultCreated has drop, store {
        project_id: u64,
        creator: address,
        vault_address: address,
        created_at: u64,
    }

    #[event]
    struct RevenueDeposited has drop, store {
        project_id: u64,
        payer: address,
        amount: u64,
        new_balance: u64,
        deposited_at: u64,
    }

    #[event]
    struct PlatformFeeCollected has drop, store {
        project_id: u64,
        payer: address,
        fee_recipient: address,
        gross_amount: u64,
        fee_amount: u64,
        net_amount: u64,
        collected_at: u64,
    }

    #[event]
    struct VaultPayoutExecuted has drop, store {
        payout_id: u64,
        project_id: u64,
        total_amount: u64,
        num_recipients: u64,
        executed_by: address,
        executed_at: u64,
    }

    const EFACTORY_NOT_INITIALIZED: u64 = 1;
    const ESPLIT_REGISTRY_NOT_INITIALIZED: u64 = 2;
    const EVAULT_ALREADY_EXISTS: u64 = 3;
    const EVAULT_NOT_FOUND: u64 = 4;
    const EUNAUTHORIZED: u64 = 5;
    const EINACTIVE_SPLIT_CONFIG: u64 = 6;
    const EFACTORY_ALREADY_INITIALIZED: u64 = 7;
    const ESPLIT_CONFIG_ALREADY_EXISTS: u64 = 8;
    const EINVALID_FEE_BPS: u64 = 9;
    const EINVALID_AMOUNT: u64 = 10;

    public entry fun init_factory(admin: &signer, usdc_metadata_address: address) {
        assert!(!exists<VaultFactory>(@Splitr), EFACTORY_ALREADY_INITIALIZED);
        split_config::init_registry(admin);
        payout_registry::init_registry(admin);
        let usdc_metadata = object::address_to_object<Metadata>(usdc_metadata_address);
        move_to(admin, VaultFactory {
            usdc_metadata,
            vaults: table::new(),
            next_payout_id: 1,
        });
    }

    public entry fun create_vault(
        creator: &signer,
        project_id: u64,
        collaborators: vector<address>,
        split_percentages: vector<u64>
    ) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        assert!(split_config::is_registry_initialized(), ESPLIT_REGISTRY_NOT_INITIALIZED);
        assert!(!split_config::has_split_config(project_id), ESPLIT_CONFIG_ALREADY_EXISTS);

        let creator_addr = signer::address_of(creator);

        let factory = borrow_global_mut<VaultFactory>(@Splitr);
        assert!(!table::contains(&factory.vaults, project_id), EVAULT_ALREADY_EXISTS);

        let vault = revenue_vault::new(project_id);
        let vault_address = revenue_vault::get_vault_address(&vault);
        table::add(&mut factory.vaults, project_id, vault);

        event::emit(VaultCreated {
            project_id,
            creator: creator_addr,
            vault_address,
            created_at: timestamp::now_seconds(),
        });

        split_config::create_split_config(
            creator,
            project_id,
            collaborators,
            split_percentages,
            vault_address
        );
    }

    public entry fun init_missing_registries(admin: &signer) {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        assert!(signer::address_of(admin) == @Splitr, EUNAUTHORIZED);

        if (!split_config::is_registry_initialized()) {
            split_config::init_registry(admin);
        };

        if (!payout_registry::is_registry_initialized()) {
            payout_registry::init_registry(admin);
        };
    }

    public entry fun deposit_revenue(
        payer: &signer,
        project_id: u64,
        amount: u64,
    ) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        assert!(amount > 0, EINVALID_AMOUNT);

        let factory = borrow_global_mut<VaultFactory>(@Splitr);
        assert!(table::contains(&factory.vaults, project_id), EVAULT_NOT_FOUND);

        let vault = table::borrow_mut(&mut factory.vaults, project_id);
        revenue_vault::deposit(vault, payer, factory.usdc_metadata, amount);

        event::emit(RevenueDeposited {
            project_id,
            payer: signer::address_of(payer),
            amount,
            new_balance: revenue_vault::get_balance(vault, factory.usdc_metadata),
            deposited_at: timestamp::now_seconds(),
        });
    }

    public entry fun deposit_revenue_with_fee(
        payer: &signer,
        project_id: u64,
        gross_amount: u64,
        fee_bps: u64,
        fee_recipient: address,
    ) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        assert!(gross_amount > 0, EINVALID_AMOUNT);
        assert!(fee_bps <= 10000, EINVALID_FEE_BPS);

        let factory = borrow_global_mut<VaultFactory>(@Splitr);
        assert!(table::contains(&factory.vaults, project_id), EVAULT_NOT_FOUND);

        let fee_amount = (((gross_amount as u128) * (fee_bps as u128)) / 10000u128) as u64;
        let net_amount = gross_amount - fee_amount;

        if (fee_amount > 0) {
            let fee_fa = primary_fungible_store::withdraw(payer, factory.usdc_metadata, fee_amount);
            primary_fungible_store::deposit(fee_recipient, fee_fa);
        };

        let vault = table::borrow_mut(&mut factory.vaults, project_id);
        revenue_vault::deposit(vault, payer, factory.usdc_metadata, net_amount);

        event::emit(PlatformFeeCollected {
            project_id,
            payer: signer::address_of(payer),
            fee_recipient,
            gross_amount,
            fee_amount,
            net_amount,
            collected_at: timestamp::now_seconds(),
        });

        event::emit(RevenueDeposited {
            project_id,
            payer: signer::address_of(payer),
            amount: net_amount,
            new_balance: revenue_vault::get_balance(vault, factory.usdc_metadata),
            deposited_at: timestamp::now_seconds(),
        });
    }

    // keep execute_payout and view functions unchanged
}
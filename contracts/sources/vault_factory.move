module Splitr::vault_factory {
    use std::signer;
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::object;
    use aptos_framework::fungible_asset::Metadata;
    use Splitr::split_config;
    use Splitr::revenue_vault::{Self, RevenueVault};
    use Splitr::payout_registry;

    struct VaultFactory has key {
        usdc_metadata: object::Object<Metadata>,
        vaults: Table<u64, RevenueVault>, // project_id -> RevenueVault
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
    struct VaultPayoutExecuted has drop, store {
        payout_id: u64,
        project_id: u64,
        total_amount: u64,
        num_recipients: u64,
        executed_by: address,
        executed_at: u64,
    }

    const EFACTORY_NOT_INITIALIZED: u64 = 1;
    const ESPLIT_CONFIG_NOT_FOUND: u64 = 2;
    const EVAULT_ALREADY_EXISTS: u64 = 3;
    const EVAULT_NOT_FOUND: u64 = 4;
    const EUNAUTHORIZED: u64 = 5;
    const EINACTIVE_SPLIT_CONFIG: u64 = 6;
    const EFACTORY_ALREADY_INITIALIZED: u64 = 7;

    /// Initialize with the Circle USDC metadata object address.
    public entry fun init_factory(admin: &signer, usdc_metadata_address: address) {
        assert!(!exists<VaultFactory>(@Splitr), EFACTORY_ALREADY_INITIALIZED);
        let usdc_metadata = object::address_to_object<Metadata>(usdc_metadata_address);
        move_to(admin, VaultFactory {
            usdc_metadata,
            vaults: table::new(),
            next_payout_id: 1,
        });
    }

    public entry fun create_vault(creator: &signer, project_id: u64) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        assert!(split_config::has_split_config(project_id), ESPLIT_CONFIG_NOT_FOUND);

        let creator_addr = signer::address_of(creator);
        let editor = split_config::get_split_editor(project_id);
        assert!(creator_addr == editor, EUNAUTHORIZED);

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
    }

    /// Pull `amount` of USDC from `payer` into the project vault.
    public entry fun deposit_revenue(
        payer: &signer,
        project_id: u64,
        amount: u64,
    ) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);

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

    public entry fun execute_payout(
        editor: &signer,
        project_id: u64,
        payout_amount: u64,
        tx_hash: vector<u8>,
    ) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);

        let editor_addr = signer::address_of(editor);
        let expected_editor = split_config::get_split_editor(project_id);
        assert!(editor_addr == expected_editor, EUNAUTHORIZED);

        let (recipients, split_bps, is_active) = split_config::get_split_config(project_id);
        assert!(is_active, EINACTIVE_SPLIT_CONFIG);

        let factory = borrow_global_mut<VaultFactory>(@Splitr);
        assert!(table::contains(&factory.vaults, project_id), EVAULT_NOT_FOUND);

        let payout_id = factory.next_payout_id;
        factory.next_payout_id = payout_id + 1;

        let vault = table::borrow_mut(&mut factory.vaults, project_id);
        let split_amounts = revenue_vault::distribute(
            vault,
            factory.usdc_metadata,
            &recipients,
            &split_bps,
            payout_amount,
        );

        let i = 0;
        while (i < vector::length(&recipients)) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&split_amounts, i);
            payout_registry::record_payout(
                editor,
                payout_id,
                project_id,
                recipient,
                amount,
                1, // success
                copy tx_hash,
            );
            i = i + 1;
        };

        event::emit(VaultPayoutExecuted {
            payout_id,
            project_id,
            total_amount: payout_amount,
            num_recipients: vector::length(&recipients),
            executed_by: editor_addr,
            executed_at: timestamp::now_seconds(),
        });
    }

    #[view]
    public fun is_initialized(): bool {
        exists<VaultFactory>(@Splitr)
    }

    #[view]
    public fun vault_exists(project_id: u64): bool acquires VaultFactory {
        if (!exists<VaultFactory>(@Splitr)) {
            false
        } else {
            let factory = borrow_global<VaultFactory>(@Splitr);
            table::contains(&factory.vaults, project_id)
        }
    }

    #[view]
    public fun get_vault_balance(project_id: u64): u64 acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        let factory = borrow_global<VaultFactory>(@Splitr);
        assert!(table::contains(&factory.vaults, project_id), EVAULT_NOT_FOUND);
        let vault = table::borrow(&factory.vaults, project_id);
        revenue_vault::get_balance(vault, factory.usdc_metadata)
    }

    #[view]
    public fun get_vault_totals(project_id: u64): (u64, u64) acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        let factory = borrow_global<VaultFactory>(@Splitr);
        assert!(table::contains(&factory.vaults, project_id), EVAULT_NOT_FOUND);
        let vault = table::borrow(&factory.vaults, project_id);
        revenue_vault::get_totals(vault)
    }

    #[view]
    public fun get_usdc_metadata_address(): address acquires VaultFactory {
        assert!(exists<VaultFactory>(@Splitr), EFACTORY_NOT_INITIALIZED);
        let factory = borrow_global<VaultFactory>(@Splitr);
        object::object_address(&factory.usdc_metadata)
    }
}

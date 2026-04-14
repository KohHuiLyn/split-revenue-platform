module Splitr::split_config {
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use std::signer;

    /// Split configuration for a project
    struct SplitConfig has key, store {
        project_id: u64,
        version: u64,
        collaborators: vector<address>,
        split_percentages: vector<u64>, // basis points (e.g., 5000 = 50%)
        is_active: bool,
        can_edit: address, // typically the project creator
        treasury_address: address,
        created_at: u64,
        last_updated_at: u64,
    }

    /// Pending split config awaiting approval
    struct PendingSplitConfig has store {
        new_config: SplitConfig,
        proposed_by: address,
        approved_by: vector<address>, // must include project creator
        created_at: u64,
    }

    /// Registry of all split configs for a project
    struct SplitRegistry has key {
        configs: Table<u64, SplitConfig>, // project_id -> current config
        pending_configs: Table<u64, PendingSplitConfig>, // project_id -> pending config
    }

    // Events
    #[event]
    struct SplitConfigCreated has drop, store {
        project_id: u64,
        version: u64,
        collaborators: vector<address>,
        split_percentages: vector<u64>,
        created_at: u64,
    }

    #[event]
    struct SplitConfigProposed has drop, store {
        project_id: u64,
        new_version: u64,
        proposed_by: address,
        reason: vector<u8>, // UTF-8 encoded reason (e.g., "collaborator_left")
        proposed_at: u64,
    }

    #[event]
    struct SplitConfigActivated has drop, store {
        project_id: u64,
        version: u64,
        previous_version: u64,
        activated_at: u64,
    }

    const EBASIS_POINTS_DONT_SUM_TO_10000: u64 = 1;
    const EUNAUTHORIZED: u64 = 2;
    const ENO_PENDING_CONFIG: u64 = 3;
    const EMISMATCH_LENGTH: u64 = 4;
    const ECONFIG_NOT_FOUND: u64 = 5;

    fun clone_address_vector(values: &vector<address>): vector<address> {
        let out = vector::empty<address>();
        let i = 0;
        while (i < vector::length(values)) {
            vector::push_back(&mut out, *vector::borrow(values, i));
            i = i + 1;
        };
        out
    }

    fun clone_u64_vector(values: &vector<u64>): vector<u64> {
        let out = vector::empty<u64>();
        let i = 0;
        while (i < vector::length(values)) {
            vector::push_back(&mut out, *vector::borrow(values, i));
            i = i + 1;
        };
        out
    }

    /// Initialize the split registry (admin function)
    public fun init_registry(admin: &signer) {
        move_to(admin, SplitRegistry {
            configs: table::new(),
            pending_configs: table::new(),
        });
    }

    /// Create initial split config for a project
    public fun create_split_config(
        creator: &signer,
        project_id: u64,
        collaborators: vector<address>,
        split_percentages: vector<u64>,
        treasury_address: address,
    ) acquires SplitRegistry {
        let creator_addr = signer::address_of(creator);
        
        // Validate: collaborators and percentages must be same length
        assert!(
            vector::length(&collaborators) == vector::length(&split_percentages),
            EMISMATCH_LENGTH
        );

        // Validate: percentages must sum to 10000 basis points (100%)
        let total = 0u64;
        let i = 0;
        while (i < vector::length(&split_percentages)) {
            total = total + *vector::borrow(&split_percentages, i);
            i = i + 1;
        };
        assert!(total == 10000, EBASIS_POINTS_DONT_SUM_TO_10000);

        let collaborators_for_event = clone_address_vector(&collaborators);
        let split_percentages_for_event = clone_u64_vector(&split_percentages);

        let now = timestamp::now_seconds();
        let config = SplitConfig {
            project_id,
            version: 1,
            collaborators: collaborators,
            split_percentages: split_percentages,
            is_active: true,
            can_edit: creator_addr,
            treasury_address,
            created_at: now,
            last_updated_at: now,
        };

        let registry = borrow_global_mut<SplitRegistry>(@Splitr);
        table::add(&mut registry.configs, project_id, config);

        event::emit(SplitConfigCreated {
            project_id,
            version: 1,
            collaborators: collaborators_for_event,
            split_percentages: split_percentages_for_event,
            created_at: now,
        });
    }

    /// Propose a new split config (called when collaborator leaves or needs rebalance)
    public fun propose_split_config_update(
        proposer: &signer,
        project_id: u64,
        new_collaborators: vector<address>,
        new_split_percentages: vector<u64>,
        reason: vector<u8>,
    ) acquires SplitRegistry {
        let proposer_addr = signer::address_of(proposer);
        let registry = borrow_global_mut<SplitRegistry>(@Splitr);

        // Check if project exists
        assert!(table::contains(&registry.configs, project_id), 2);

        // Validate percentages
        assert!(
            vector::length(&new_collaborators) == vector::length(&new_split_percentages),
            EMISMATCH_LENGTH
        );
        let total = 0u64;
        let i = 0;
        while (i < vector::length(&new_split_percentages)) {
            total = total + *vector::borrow(&new_split_percentages, i);
            i = i + 1;
        };
        assert!(total == 10000, EBASIS_POINTS_DONT_SUM_TO_10000);

        let current_config = table::borrow(&registry.configs, project_id);
        let now = timestamp::now_seconds();

        let new_config = SplitConfig {
            project_id,
            version: current_config.version + 1,
            collaborators: new_collaborators,
            split_percentages: new_split_percentages,
            is_active: false, // not active until approved
            can_edit: current_config.can_edit,
            treasury_address: current_config.treasury_address,
            created_at: now,
            last_updated_at: now,
        };

        let pending = PendingSplitConfig {
            new_config,
            proposed_by: proposer_addr,
            approved_by: vector::empty(),
            created_at: now,
        };

        table::add(&mut registry.pending_configs, project_id, pending);

        event::emit(SplitConfigProposed {
            project_id,
            new_version: current_config.version + 1,
            proposed_by: proposer_addr,
            reason,
            proposed_at: now,
        });
    }

    /// Approve pending split config (creator/authorized approver)
    public fun approve_split_config(
        approver: &signer,
        project_id: u64,
    ) acquires SplitRegistry {
        let approver_addr = signer::address_of(approver);
        let registry = borrow_global_mut<SplitRegistry>(@Splitr);

        // Check if pending config exists
        assert!(table::contains(&registry.pending_configs, project_id), ENO_PENDING_CONFIG);

        let pending = table::borrow_mut(&mut registry.pending_configs, project_id);
        let current_config = table::borrow(&registry.configs, project_id);

        // Only creator can approve
        assert!(approver_addr == current_config.can_edit, EUNAUTHORIZED);

        vector::push_back(&mut pending.approved_by, approver_addr);

        // Once creator approves, activate the new config
        if (vector::contains(&pending.approved_by, &current_config.can_edit)) {
            let PendingSplitConfig {
                new_config,
                proposed_by: _,
                approved_by: _,
                created_at: _,
            } = table::remove(&mut registry.pending_configs, project_id);
            let old_version = current_config.version;

            new_config.is_active = true;
            let old_config = table::remove(&mut registry.configs, project_id);
            let SplitConfig {
                project_id: _,
                version: _,
                collaborators: _,
                split_percentages: _,
                is_active: _,
                can_edit: _,
                treasury_address: _,
                created_at: _,
                last_updated_at: _,
            } = old_config;
            table::add(&mut registry.configs, project_id, new_config);

            let now = timestamp::now_seconds();
            event::emit(SplitConfigActivated {
                project_id,
                version: old_version + 1,
                previous_version: old_version,
                activated_at: now,
            });
        }
    }

    /// Get current split config for a project
    public fun get_split_config(project_id: u64): (vector<address>, vector<u64>, bool) acquires SplitRegistry {
        let registry = borrow_global<SplitRegistry>(@Splitr);
        let config = table::borrow(&registry.configs, project_id);
        (
            clone_address_vector(&config.collaborators),
            clone_u64_vector(&config.split_percentages),
            config.is_active,
        )
    }

    // Check if a split config exists for a project
    #[view]
    public fun has_split_config(project_id: u64): bool acquires SplitRegistry {
        if (!exists<SplitRegistry>(@Splitr)) {
            false
        } else {
            let registry = borrow_global<SplitRegistry>(@Splitr);
            table::contains(&registry.configs, project_id)
        }
    }

    // Get project editor for authorization checks
    #[view]
    public fun get_split_editor(project_id: u64): address acquires SplitRegistry {
        let registry = borrow_global<SplitRegistry>(@Splitr);
        assert!(table::contains(&registry.configs, project_id), ECONFIG_NOT_FOUND);
        let config = table::borrow(&registry.configs, project_id);
        config.can_edit
    }

    // Get project treasury address from split config
    #[view]
    public fun get_treasury_address(project_id: u64): address acquires SplitRegistry {
        let registry = borrow_global<SplitRegistry>(@Splitr);
        assert!(table::contains(&registry.configs, project_id), ECONFIG_NOT_FOUND);
        let config = table::borrow(&registry.configs, project_id);
        config.treasury_address
    }

    /// Deactivate current split config (e.g., when new one is ready)
    public fun deactivate_split_config(admin: &signer, project_id: u64) acquires SplitRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<SplitRegistry>(@Splitr);

        let config = table::borrow_mut(&mut registry.configs, project_id);
        assert!(admin_addr == config.can_edit, EUNAUTHORIZED);
        config.is_active = false;
    }
}

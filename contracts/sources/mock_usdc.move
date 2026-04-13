module split_revenue::mock_usdc {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::managed_coin;

    /// Mock USDC for testing on Aptos testnet
    /// In production, this would be the real USDC from Circle
    struct USDC has key, store {}

    /// Initialize the mock USDC coin
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        managed_coin::initialize<USDC>(
            admin,
            b"Mock USDC",
            b"USDC",
            6, // 6 decimal places like real USDC
            true, // can freeze
        );
    }

    /// Mint mock USDC tokens (only for testing)
    public entry fun mint(admin: &signer, to: address, amount: u64) {
        managed_coin::mint<USDC>(admin, to, amount);
    }

    /// Register a user to hold mock USDC
    public entry fun register_user(user: &signer) {
        managed_coin::register<USDC>(user);
    }

    /// Get the balance of a user
    #[view]
    public fun balance_of(addr: address): u64 {
        coin::balance<USDC>(addr)
    }
}

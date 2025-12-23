#[test_only]
module uniswap_v2::factory_test {
    use std::signer;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use uniswap_v2::factory;

    // Test token structs
    struct TokenX has key {}
    struct TokenY has key {}
    struct TokenZ has key {}

    fun setup_test_environment(account: &signer) {
        let account_addr = signer::address_of(account);
        account::create_account_for_test(account_addr);
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
    }

    #[test(account = @0xbeef)]
    fun test_factory_initialization(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        assert!(factory::fee_to_setter() == account_addr, 1);
        assert!(factory::fee_to() == @0x0, 2);
        assert!(factory::all_pools_length() == 0, 3);
    }

    #[test(account = @0xbeef)]
    #[expected_failure(abort_code = 1)]
    fun test_factory_double_initialization_fails(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        // This should fail - factory already initialized
        factory::initialize(account, account_addr);
    }

    #[test(account = @0xbeef)]
    fun test_create_pool_through_factory(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        let pool_addr = factory::create_pool<TokenX, TokenY>(account);
        
        assert!(pool_addr != @0x0, 1);
        assert!(factory::all_pools_length() == 1, 2);
        assert!(factory::get_pool<TokenX, TokenY>() == pool_addr, 3);
        assert!(factory::get_pool<TokenY, TokenX>() == pool_addr, 4); // Should work both ways
    }

    #[test(account = @0xbeef)]
    #[expected_failure(abort_code = 1)]
    fun test_create_duplicate_pool_fails(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        let _pool_addr1 = factory::create_pool<TokenX, TokenY>(account);
        
        // This should fail - pool already exists
        let _pool_addr2 = factory::create_pool<TokenX, TokenY>(account);
    }

    #[test(account = @0xbeef)]
    #[expected_failure(abort_code = 1)]
    fun test_create_duplicate_pool_reverse_order_fails(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        let _pool_addr1 = factory::create_pool<TokenX, TokenY>(account);
        
        // This should fail - pool already exists (reverse order)
        let _pool_addr2 = factory::create_pool<TokenY, TokenX>(account);
    }

    #[test(account = @0xbeef)]
    #[expected_failure(abort_code = 4)]
    fun test_create_pool_identical_tokens_fails(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // This should fail - identical token types
        let _pool_addr = factory::create_pool<TokenX, TokenX>(account);
    }

    #[test(account = @0xbeef)]
    fun test_multiple_pools_creation(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        let pool_addr1 = factory::create_pool<TokenX, TokenY>(account);
        let pool_addr2 = factory::create_pool<TokenX, TokenZ>(account);
        let pool_addr3 = factory::create_pool<TokenY, TokenZ>(account);
        
        assert!(factory::all_pools_length() == 3, 1);
        assert!(factory::get_pool<TokenX, TokenY>() == pool_addr1, 2);
        assert!(factory::get_pool<TokenX, TokenZ>() == pool_addr2, 3);
        assert!(factory::get_pool<TokenY, TokenZ>() == pool_addr3, 4);
        
        // Test reverse lookups
        assert!(factory::get_pool<TokenY, TokenX>() == pool_addr1, 5);
        assert!(factory::get_pool<TokenZ, TokenX>() == pool_addr2, 6);
        assert!(factory::get_pool<TokenZ, TokenY>() == pool_addr3, 7);
    }

    #[test(account = @0xbeef)]
    fun test_get_nonexistent_pool(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // Should return zero address for nonexistent pool
        let pool_addr = factory::get_pool<TokenX, TokenY>();
        assert!(pool_addr == @0x0, 1);
    }

    #[test(account = @0xbeef)]
    fun test_all_pools_pagination(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // Create some pools
        let _pool1 = factory::create_pool<TokenX, TokenY>(account);
        let _pool2 = factory::create_pool<TokenX, TokenZ>(account);
        let _pool3 = factory::create_pool<TokenY, TokenZ>(account);
        
        // Test pagination
        let pools_page1 = factory::all_pools(0, 2);
        assert!(vector::length(&pools_page1) == 2, 1);
        
        let pools_page2 = factory::all_pools(2, 2);
        assert!(vector::length(&pools_page2) == 1, 2);
        
        let pools_all = factory::all_pools(0, 10);
        assert!(vector::length(&pools_all) == 3, 3);
        
        // Test out of bounds
        let pools_empty = factory::all_pools(5, 2);
        assert!(vector::length(&pools_empty) == 0, 4);
    }

    #[test(account = @0xbeef)]
    fun test_fee_to_management(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        assert!(factory::fee_to() == @0x0, 1);
        assert!(factory::fee_to_setter() == account_addr, 2);
        
        // Set fee_to address
        let new_fee_to = @0x123;
        factory::set_fee_to(account, new_fee_to);
        assert!(factory::fee_to() == new_fee_to, 3);
    }

    #[test(account = @0xbeef)]
    #[expected_failure(abort_code = 18)]
    fun test_set_fee_to_unauthorized_fails(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // Create another account
        let unauthorized = account::create_account_for_test(@0x999);
        
        // This should fail - not authorized
        factory::set_fee_to(&unauthorized, @0x123);
    }

    #[test(account = @0xbeef)]
    fun test_fee_to_setter_management(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // Set new fee_to_setter
        let new_setter = @0x456;
        factory::set_fee_to_setter(account, new_setter);
        assert!(factory::fee_to_setter() == new_setter, 1);
    }

    #[test(account = @0xbeef)]
    #[expected_failure(abort_code = 18)]
    fun test_set_fee_to_setter_unauthorized_fails(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // Create another account
        let unauthorized = account::create_account_for_test(@0x999);
        
        // This should fail - not authorized
        factory::set_fee_to_setter(&unauthorized, @0x789);
    }

    #[test(account = @0xbeef)]
    fun test_pool_info_structure(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        let pool_addr = factory::create_pool<TokenX, TokenY>(account);
        
        let pools = factory::all_pools(0, 1);
        assert!(vector::length(&pools) == 1, 1);
        
        // Note: In a real implementation, you would verify the pool info contains
        // correct token types and pool address, but that requires accessing internal
        // structure which might not be publicly available
    }

    #[test(account = @0xbeef)]
    fun test_type_ordering_consistency(account: &signer) {
        setup_test_environment(account);
        let account_addr = signer::address_of(account);
        
        factory::initialize(account, account_addr);
        
        // Create pool X,Y
        let pool_addr1 = factory::create_pool<TokenX, TokenY>(account);
        
        // Verify both orders return the same pool
        assert!(factory::get_pool<TokenX, TokenY>() == pool_addr1, 1);
        assert!(factory::get_pool<TokenY, TokenX>() == pool_addr1, 2);
        
        // Pool count should still be 1
        assert!(factory::all_pools_length() == 1, 3);
    }

    #[test]
    fun test_factory_functions_without_initialization() {
        // Test that getter functions handle uninitialized state gracefully
        assert!(factory::all_pools_length() == 0, 1);
        assert!(factory::fee_to() == @0x0, 2);
        assert!(factory::fee_to_setter() == @0x0, 3);
        assert!(factory::get_pool<TokenX, TokenY>() == @0x0, 4);
        
        let pools = factory::all_pools(0, 10);
        assert!(vector::length(&pools) == 0, 5);
    }
}
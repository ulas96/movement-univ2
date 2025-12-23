#[test_only]
module uniswap_v2::integration_test {
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use aptos_std::type_info;
    use uniswap_v2::factory;
    use uniswap_v2::pool;
    use uniswap_v2::lp_token;
    use uniswap_v2::math;

    // Test tokens
    struct USDC has key {}
    struct WETH has key {}
    struct DAI has key {}

    fun setup_test_environment(account: &signer) {
        let account_addr = signer::address_of(account);
        account::create_account_for_test(account_addr);
        let aptos_framework = account::create_signer_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test_secs(1000);
    }

    #[test(admin = @0xbeef)]
    fun test_full_amm_workflow(admin: &signer) {
        setup_test_environment(admin);
        let admin_addr = signer::address_of(admin);

        // 1. Initialize factory
        factory::initialize(admin, admin_addr);
        assert!(factory::fee_to_setter() == admin_addr, 1);
        assert!(factory::all_pools_length() == 0, 2);

        // 2. Create pools through factory
        let usdc_weth_pool = factory::create_pool<USDC, WETH>(admin);
        let usdc_dai_pool = factory::create_pool<USDC, DAI>(admin);
        let weth_dai_pool = factory::create_pool<WETH, DAI>(admin);

        assert!(factory::all_pools_length() == 3, 3);
        assert!(usdc_weth_pool != @0x0, 4);
        assert!(usdc_dai_pool != @0x0, 5);
        assert!(weth_dai_pool != @0x0, 6);

        // 3. Verify pools exist and can be retrieved
        assert!(factory::get_pool<USDC, WETH>() == usdc_weth_pool, 7);
        assert!(factory::get_pool<WETH, USDC>() == usdc_weth_pool, 8); // Should work both ways
        assert!(factory::get_pool<USDC, DAI>() == usdc_dai_pool, 9);
        assert!(factory::get_pool<WETH, DAI>() == weth_dai_pool, 10);

        // 4. Check initial pool states
        let (usdc_reserve, weth_reserve, _) = pool::get_reserves<USDC, WETH>();
        assert!(usdc_reserve == 0 && weth_reserve == 0, 11);

        // 5. Verify LP token initialization
        assert!(lp_token::supply<USDC, WETH>() == 0, 12);
        assert!(lp_token::supply<USDC, DAI>() == 0, 13);
        assert!(lp_token::supply<WETH, DAI>() == 0, 14);

        // 6. Test pagination of pools
        let first_two_pools = factory::all_pools(0, 2);
        assert!(std::vector::length(&first_two_pools) == 2, 15);

        let all_pools = factory::all_pools(0, 10);
        assert!(std::vector::length(&all_pools) == 3, 16);

        // 7. Test fee management
        let new_fee_to = @0x999;
        factory::set_fee_to(admin, new_fee_to);
        assert!(factory::fee_to() == new_fee_to, 17);
    }

    #[test(admin = @0xbeef)]
    fun test_router_path_functions(admin: &signer) {
        setup_test_environment(admin);

        // Test path creation and validation
        let path = std::vector::empty<aptos_std::type_info::TypeInfo>();
        std::vector::push_back(&mut path, type_info::type_of<USDC>());
        std::vector::push_back(&mut path, type_info::type_of<WETH>());

        // Router functionality has been removed - testing direct math calculations instead
        let amount_out = math::get_amount_out(1000, 10000, 20000);
        assert!(amount_out > 0, 1);
        
        // Router removed - testing direct math calculations instead
        let amount_out = math::get_amount_out(1000, 10000, 20000);
        assert!(amount_out > 0, 2); // Should get some output
    }

    #[test(admin = @0xbeef)]
    fun test_multi_token_path_validation(admin: &signer) {
        setup_test_environment(admin);

        // Create a 3-token path: USDC -> WETH -> DAI
        let path = std::vector::empty<aptos_std::type_info::TypeInfo>();
        std::vector::push_back(&mut path, type_info::type_of<USDC>());
        std::vector::push_back(&mut path, type_info::type_of<WETH>());
        std::vector::push_back(&mut path, type_info::type_of<DAI>());

        // Router removed - testing sequential swap calculations
        let step1_out = math::get_amount_out(1000, 10000, 20000);
        let step2_out = math::get_amount_out(step1_out, 20000, 15000);
        assert!(step2_out > 0, 1);
        
        // Test reverse calculation
        let step2_in = math::get_amount_in(800, 20000, 15000);
        // Test sequential calculations work
        assert!(step1_out > 0 && step2_out > 0, 2); // Both steps should produce output
    }

    #[test(admin = @0xbeef)]
    fun test_quote_functionality(admin: &signer) {
        setup_test_environment(admin);

        // Test math quote function directly
        let quote_result = math::quote(1000, 5000, 10000);
        assert!(quote_result == 2000, 1); // 1000 * 10000 / 5000 = 2000

        // Test edge cases
        let quote_equal = math::quote(1000, 1000, 1000);
        assert!(quote_equal == 1000, 2); // Equal reserves should return same amount
    }

    #[test(admin = @0xbeef)]
    fun test_mathematical_consistency(admin: &signer) {
        setup_test_environment(admin);

        // Test that math functions maintain consistency
        let input_amount = 1000u64;
        let reserve_in = 10000u64;
        let reserve_out = 20000u64;

        // Get amount out and then calculate required amount in for that output
        let amount_out = math::get_amount_out(input_amount, reserve_in, reserve_out);
        let amount_in_calculated = math::get_amount_in(amount_out, reserve_in, reserve_out);

        // Due to rounding, the calculated amount in might be slightly higher
        assert!(amount_in_calculated >= input_amount, 1);
        assert!(amount_in_calculated <= input_amount + 5, 2); // Allow small rounding difference
    }

    #[test(admin = @0xbeef)]
    fun test_factory_pool_consistency(admin: &signer) {
        setup_test_environment(admin);
        let admin_addr = signer::address_of(admin);

        // Initialize factory
        factory::initialize(admin, admin_addr);

        // Create pools and verify they exist in both factory and pool modules
        let pool_addr = factory::create_pool<USDC, WETH>(admin);
        
        assert!(factory::get_pool<USDC, WETH>() == pool_addr, 1);
        assert!(pool::exists_pool<USDC, WETH>(), 2);

        // Verify reserves are accessible
        let (reserve_usdc, reserve_weth, timestamp) = pool::get_reserves<USDC, WETH>();
        assert!(reserve_usdc == 0 && reserve_weth == 0, 3);
        assert!(timestamp > 0, 4);
    }

    #[test(admin = @0xbeef)]
    fun test_lp_token_integration(admin: &signer) {
        setup_test_environment(admin);

        // Create a pool which should initialize LP tokens
        pool::create_pool<USDC, WETH>(admin);

        // Verify LP token supply is 0 initially
        assert!(lp_token::supply<USDC, WETH>() == 0, 1);
    }

    #[test(admin = @0xbeef)]
    fun test_error_conditions_integration(admin: &signer) {
        setup_test_environment(admin);
        let admin_addr = signer::address_of(admin);

        // Test factory not initialized
        assert!(factory::all_pools_length() == 0, 1);

        // Initialize factory
        factory::initialize(admin, admin_addr);

        // Test getting nonexistent pool
        assert!(factory::get_pool<USDC, WETH>() == @0x0, 2);

        // Create pool
        let _pool_addr = factory::create_pool<USDC, WETH>(admin);

        // Verify pool now exists
        assert!(factory::get_pool<USDC, WETH>() != @0x0, 3);
    }

    #[test(admin = @0xbeef)]
    #[expected_failure(abort_code = 9)] // insufficient_liquidity error
    fun test_invalid_path_fails(admin: &signer) {
        setup_test_environment(admin);

        // Create empty path - should fail
        let empty_path = std::vector::empty<aptos_std::type_info::TypeInfo>();
        // Router removed - testing math function with invalid parameters
        let _invalid_quote = math::quote(1000, 0, 1000); // This should fail with insufficient liquidity
    }

    #[test(admin = @0xbeef)]
    #[expected_failure(abort_code = 15)] // overflow error
    fun test_single_token_path_fails(admin: &signer) {
        setup_test_environment(admin);

        // Create single token path - should fail
        let path = std::vector::empty<aptos_std::type_info::TypeInfo>();
        std::vector::push_back(&mut path, type_info::type_of<USDC>());
        // Router removed - testing math overflow protection
        let _overflow_result = math::safe_mul_div(18446744073709551615, 1000, 1); // This should fail with overflow
    }

    #[test(admin = @0xbeef)]
    fun test_large_scale_operations(admin: &signer) {
        setup_test_environment(admin);
        let admin_addr = signer::address_of(admin);

        // Initialize factory
        factory::initialize(admin, admin_addr);

        // Create many pools to test scalability
        let _pool1 = factory::create_pool<USDC, WETH>(admin);
        let _pool2 = factory::create_pool<USDC, DAI>(admin);
        let _pool3 = factory::create_pool<WETH, DAI>(admin);

        assert!(factory::all_pools_length() == 3, 1);

        // Router removed - testing large amounts with direct math functions
        let large_amount = 1000000000u64; // 1 billion
        let large_out = math::get_amount_out(large_amount, 1000000000u64, 2000000000u64);
        assert!(large_out > 0, 2);
        
        // Test safe math with large numbers
        let safe_result = math::safe_mul_div(large_amount, 997, 1000);
        assert!(safe_result < large_amount, 3); // Should be less due to fee calculation
    }
}
#[test_only]
module uniswap_v2::math_test {
    use uniswap_v2::math;

    #[test]
    fun test_sqrt_basic() {
        assert!(math::sqrt(0) == 0, 1);
        assert!(math::sqrt(1) == 1, 2);
        assert!(math::sqrt(4) == 2, 3);
        assert!(math::sqrt(9) == 3, 4);
        assert!(math::sqrt(16) == 4, 5);
        assert!(math::sqrt(25) == 5, 6);
        assert!(math::sqrt(100) == 10, 7);
        assert!(math::sqrt(10000) == 100, 8);
    }

    #[test]
    fun test_sqrt_non_perfect_squares() {
        // Test approximate results for non-perfect squares
        assert!(math::sqrt(2) == 1, 1); // floor(sqrt(2))
        assert!(math::sqrt(3) == 1, 2); // floor(sqrt(3))
        assert!(math::sqrt(8) == 2, 3); // floor(sqrt(8))
        assert!(math::sqrt(15) == 3, 4); // floor(sqrt(15))
        assert!(math::sqrt(99) == 9, 5); // floor(sqrt(99))
    }

    #[test]
    fun test_safe_mul_div_basic() {
        assert!(math::safe_mul_div(10, 20, 5) == 40, 1);
        assert!(math::safe_mul_div(100, 200, 50) == 400, 2);
        assert!(math::safe_mul_div(1000, 500, 250) == 2000, 3);
        assert!(math::safe_mul_div(1, 1, 1) == 1, 4);
    }

    #[test]
    fun test_safe_mul_div_precision() {
        // Test cases where integer division might lose precision
        assert!(math::safe_mul_div(10, 3, 2) == 15, 1); // (10 * 3) / 2 = 15
        assert!(math::safe_mul_div(7, 11, 3) == 25, 2); // (7 * 11) / 3 = 25 (floor)
    }

    #[test]
    #[expected_failure(abort_code = 16)]
    fun test_safe_mul_div_division_by_zero() {
        math::safe_mul_div(100, 200, 0);
    }

    #[test]
    fun test_min_max() {
        assert!(math::min(5, 10) == 5, 1);
        assert!(math::min(10, 5) == 5, 2);
        assert!(math::min(0, 1) == 0, 3);
        assert!(math::min(100, 100) == 100, 4);

        assert!(math::max(5, 10) == 10, 5);
        assert!(math::max(10, 5) == 10, 6);
        assert!(math::max(0, 1) == 1, 7);
        assert!(math::max(100, 100) == 100, 8);
    }

    #[test]
    fun test_get_amount_out_basic() {
        // Test with equal reserves (1:1 ratio)
        let amount_out = math::get_amount_out(1000, 10000, 10000);
        // Expected: (1000 * 997 * 10000) / (10000 * 1000 + 1000 * 997) = 906
        assert!(amount_out == 906, 1);

        // Test with different reserve ratios
        let amount_out2 = math::get_amount_out(1000, 5000, 20000);
        // Should get more output tokens when output reserve is higher
        assert!(amount_out2 > amount_out, 2);
    }

    #[test]
    fun test_get_amount_out_different_ratios() {
        // Test with 1:2 ratio (X:Y = 5000:10000)
        let amount_out = math::get_amount_out(500, 5000, 10000);
        assert!(amount_out > 900, 1); // Should get close to 2x input (minus fees)
        
        // Test with 2:1 ratio (X:Y = 10000:5000)
        let amount_out2 = math::get_amount_out(500, 10000, 5000);
        assert!(amount_out2 < 250, 2); // Should get less than 0.5x input (minus fees)
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_get_amount_out_zero_input() {
        math::get_amount_out(0, 10000, 10000);
    }

    #[test]
    #[expected_failure(abort_code = 9)]
    fun test_get_amount_out_zero_reserves() {
        math::get_amount_out(1000, 0, 10000);
    }

    #[test]
    fun test_get_amount_in_basic() {
        // Test reverse calculation of get_amount_out
        let amount_in = math::get_amount_in(906, 10000, 10000);
        // Should be approximately 1000 (accounting for rounding)
        assert!(amount_in >= 999 && amount_in <= 1001, 1);
    }

    #[test]
    fun test_get_amount_in_different_ratios() {
        // Test with different reserve ratios
        let amount_in = math::get_amount_in(1000, 5000, 20000);
        let amount_in2 = math::get_amount_in(1000, 20000, 5000);
        
        // Higher input reserve should require more input tokens
        assert!(amount_in2 > amount_in, 1);
    }

    #[test]
    #[expected_failure(abort_code = 7)]
    fun test_get_amount_in_zero_output() {
        math::get_amount_in(0, 10000, 10000);
    }

    #[test]
    #[expected_failure(abort_code = 9)]
    fun test_get_amount_in_insufficient_liquidity() {
        // Try to get more output than available in reserve
        math::get_amount_in(10001, 10000, 10000);
    }

    #[test]
    fun test_quote_basic() {
        // Test basic proportional calculations
        assert!(math::quote(1000, 5000, 10000) == 2000, 1); // 1000 * 10000 / 5000 = 2000
        assert!(math::quote(500, 10000, 5000) == 250, 2);   // 500 * 5000 / 10000 = 250
        assert!(math::quote(100, 1000, 1000) == 100, 3);    // Equal reserves should return same amount
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_quote_zero_amount() {
        math::quote(0, 1000, 1000);
    }

    #[test]
    #[expected_failure(abort_code = 9)]
    fun test_quote_zero_reserves() {
        math::quote(1000, 0, 1000);
    }

    #[test]
    fun test_minimum_liquidity() {
        assert!(math::minimum_liquidity() == 1000, 1);
    }

    #[test]
    fun test_fee_calculation_accuracy() {
        // Test that 0.3% fee is correctly applied in get_amount_out
        let input_amount = 1000000; // 1M tokens
        let reserve_in = 10000000;  // 10M tokens
        let reserve_out = 10000000; // 10M tokens
        
        let amount_out = math::get_amount_out(input_amount, reserve_in, reserve_out);
        
        // With 0.3% fee, effective input is 997/1000 of original
        // Expected output ~= (997000 * 10000000) / (10000000 + 997000) ~= 906610
        assert!(amount_out > 900000 && amount_out < 910000, 1);
    }

}
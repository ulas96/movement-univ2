import type { TokenInfo } from "../types";
import { ENV } from "../config/env";

// Network Configuration (loaded from environment variables)
export const NETWORK_CONFIG = {
  name: ENV.VITE_NETWORK === 'mainnet' ? 'Movement Mainnet' : 'Movement Testnet',
  fullnode: ENV.VITE_RPC_URL,
  contractAddress: ENV.VITE_CONTRACT_ADDRESS,
};

// Contract Address (from environment)
export const CONTRACT_ADDRESS = ENV.VITE_CONTRACT_ADDRESS;

// Token Decimals
export const TOKEN_DECIMALS = 8;
export const DECIMAL_MULTIPLIER = 100_000_000; // 10^8

// Fee Configuration (Uniswap V2 uses 0.3% fee)
export const FEE_NUMERATOR = 997;
export const FEE_DENOMINATOR = 1000;

// Minimum Liquidity (locked on first mint)
export const MINIMUM_LIQUIDITY = 1000;

// Default Slippage (0.5%)
export const DEFAULT_SLIPPAGE = 0.5;

// Price Impact Warning Thresholds
export const PRICE_IMPACT_THRESHOLDS = {
  LOW: 1, // < 1% = green
  MEDIUM: 3, // 1-3% = yellow
  HIGH: 5, // 3-5% = orange
  CRITICAL: 5, // > 5% = red (requires confirmation)
};

// Available Tokens
export const AVAILABLE_TOKENS: TokenInfo[] = [
  {
    name: "Token A",
    symbol: "TKA",
    type: `${CONTRACT_ADDRESS}::token_a::TokenA`,
    decimals: TOKEN_DECIMALS,
    logoUrl: undefined, // Can add logo URLs later
  },
  {
    name: "Token B",
    symbol: "TKB",
    type: `${CONTRACT_ADDRESS}::token_b::TokenB`,
    decimals: TOKEN_DECIMALS,
    logoUrl: undefined,
  },
];

// Module Names
export const MODULES = {
  FACTORY: "factory",
  POOL: "pool",
  LP_TOKEN: "lp_token",
  MATH: "math",
};

// Function Names
export const FUNCTIONS = {
  // Factory
  CREATE_POOL: `${CONTRACT_ADDRESS}::${MODULES.FACTORY}::create_pool_entry` as const,
  GET_POOL: `${CONTRACT_ADDRESS}::${MODULES.FACTORY}::get_pool` as const,
  ALL_POOLS_LENGTH: `${CONTRACT_ADDRESS}::${MODULES.FACTORY}::all_pools_length` as const,

  // Pool
  ADD_LIQUIDITY: `${CONTRACT_ADDRESS}::${MODULES.POOL}::add_liquidity_entry` as const,
  REMOVE_LIQUIDITY: `${CONTRACT_ADDRESS}::${MODULES.POOL}::remove_liquidity_entry` as const,
  SWAP_X_TO_Y: `${CONTRACT_ADDRESS}::${MODULES.POOL}::swap_x_to_y_entry` as const,
  SWAP_Y_TO_X: `${CONTRACT_ADDRESS}::${MODULES.POOL}::swap_y_to_x_entry` as const,
  GET_RESERVES: `${CONTRACT_ADDRESS}::${MODULES.POOL}::get_reserves` as const,
  EXISTS_POOL: `${CONTRACT_ADDRESS}::${MODULES.POOL}::exists_pool` as const,

  // LP Token
  GET_BALANCE: `${CONTRACT_ADDRESS}::${MODULES.LP_TOKEN}::get_balance` as const,
  GET_SUPPLY: `${CONTRACT_ADDRESS}::${MODULES.LP_TOKEN}::get_supply` as const,
} as const;

/**
 * Environment Configuration
 *
 * Loads and validates environment variables from .env files
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 */

interface EnvironmentConfig {
  VITE_NETWORK: string;
  VITE_CONTRACT_ADDRESS: string;
  VITE_RPC_URL: string;
  VITE_EXPLORER_URL: string;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
}

/**
 * Load environment variables with type safety
 */
export const ENV: EnvironmentConfig = {
  VITE_NETWORK: import.meta.env.VITE_NETWORK || 'testnet',
  VITE_CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS || '',
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL || '',
  VITE_EXPLORER_URL: import.meta.env.VITE_EXPLORER_URL || 'https://explorer.movementnetwork.xyz',
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

/**
 * Validate required environment variables
 * Throws an error if any required variable is missing
 */
export function validateEnv(): void {
  const errors: string[] = [];

  if (!ENV.VITE_CONTRACT_ADDRESS) {
    errors.push('VITE_CONTRACT_ADDRESS is required. Please set it in your .env.local file.');
  }

  if (!ENV.VITE_RPC_URL) {
    errors.push('VITE_RPC_URL is required. Please set it in your .env.local file.');
  }

  // Validate contract address format (should be 0x followed by 64 hex chars)
  if (ENV.VITE_CONTRACT_ADDRESS && !/^0x[a-fA-F0-9]{64}$/.test(ENV.VITE_CONTRACT_ADDRESS)) {
    errors.push(`VITE_CONTRACT_ADDRESS has invalid format: ${ENV.VITE_CONTRACT_ADDRESS}`);
  }

  // Validate network value
  if (ENV.VITE_NETWORK && !['testnet', 'mainnet'].includes(ENV.VITE_NETWORK)) {
    errors.push(`VITE_NETWORK must be either 'testnet' or 'mainnet', got: ${ENV.VITE_NETWORK}`);
  }

  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment Configuration Error',
      '',
      'Missing or invalid environment variables:',
      ...errors.map(err => `  • ${err}`),
      '',
      'Please create a .env.local file based on .env.example',
      'See /client/.env.example for reference',
    ].join('\n');

    throw new Error(errorMessage);
  }
}

/**
 * Get the block explorer URL for a transaction
 */
export function getExplorerUrl(hash: string, type: 'transaction' | 'account' = 'transaction'): string {
  const baseUrl = ENV.VITE_EXPLORER_URL;
  return type === 'transaction'
    ? `${baseUrl}/txn/${hash}`
    : `${baseUrl}/account/${hash}`;
}

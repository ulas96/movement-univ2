/**
 * Contract Error Mapping
 *
 * Maps all error codes from the smart contract (web3/sources/errors.move)
 * to user-friendly messages with suggested actions.
 */

export interface ContractError {
  title: string;
  message: string;
  action?: string;
}

/**
 * Map of all 21 contract error codes to user-friendly messages
 * Error codes are defined in: web3/sources/errors.move
 */
export const CONTRACT_ERRORS: Record<number, ContractError> = {
  // Pool errors (1-4)
  1: {
    title: 'Pool Already Exists',
    message: 'A liquidity pool for this token pair already exists.',
    action: 'Add liquidity to the existing pool instead of creating a new one.',
  },
  2: {
    title: 'Pool Not Found',
    message: 'No liquidity pool exists for this token pair.',
    action: 'Create a new pool by adding initial liquidity.',
  },
  3: {
    title: 'Invalid Pool Type',
    message: 'The pool configuration is invalid.',
    action: 'Ensure you are using compatible token types.',
  },
  4: {
    title: 'Identical Tokens',
    message: 'Cannot create a pool with the same token for both sides.',
    action: 'Select two different tokens for the pair.',
  },

  // Liquidity errors (5-9)
  5: {
    title: 'Insufficient Liquidity Minted',
    message: 'The liquidity amount is too small to mint LP tokens.',
    action: 'Increase the token amounts you are adding to the pool.',
  },
  6: {
    title: 'Insufficient Liquidity to Burn',
    message: 'You do not have enough LP tokens to remove this amount of liquidity.',
    action: 'Check your LP token balance and enter a valid amount.',
  },
  7: {
    title: 'Insufficient Output Amount',
    message: 'The swap would receive less than your minimum acceptable amount.',
    action: 'Increase slippage tolerance or reduce the swap amount.',
  },
  8: {
    title: 'Insufficient Input Amount',
    message: 'The input amount is too small for this operation.',
    action: 'Increase the amount you are swapping or adding.',
  },
  9: {
    title: 'Insufficient Pool Liquidity',
    message: 'The pool does not have enough liquidity for this operation.',
    action: 'Try a smaller amount or wait for more liquidity to be added.',
  },

  // Swap errors (10-14)
  10: {
    title: 'Swap Deadline Exceeded',
    message: 'The transaction took too long and the deadline has passed.',
    action: 'Try submitting the transaction again.',
  },
  11: {
    title: 'Output Amount Too Small',
    message: 'The expected output is below the minimum required amount.',
    action: 'Adjust slippage settings or reduce the swap amount.',
  },
  12: {
    title: 'Input Amount Too Large',
    message: 'The input amount exceeds the maximum allowed.',
    action: 'Reduce the amount you are trying to swap.',
  },
  13: {
    title: 'Invalid Swap Path',
    message: 'The swap route is invalid or unavailable.',
    action: 'Check that a valid pool exists for this token pair.',
  },
  14: {
    title: 'Zero Amount Not Allowed',
    message: 'Transaction amount cannot be zero.',
    action: 'Enter a valid amount greater than zero.',
  },

  // Math errors (15-17)
  15: {
    title: 'Arithmetic Overflow',
    message: 'The calculation resulted in a number that is too large.',
    action: 'Try using smaller amounts.',
  },
  16: {
    title: 'Division by Zero',
    message: 'A calculation error occurred (division by zero).',
    action: 'This is an internal error. Please contact support.',
  },
  17: {
    title: 'Square Root Overflow',
    message: 'The liquidity calculation resulted in an overflow.',
    action: 'Try using smaller amounts for initial liquidity.',
  },

  // Permission errors (18-19)
  18: {
    title: 'Not Authorized',
    message: 'You are not authorized to perform this action.',
    action: 'Ensure you are connected with the correct wallet.',
  },
  19: {
    title: 'Not Owner',
    message: 'Only the owner can perform this action.',
    action: 'Connect with the owner wallet to proceed.',
  },

  // Token errors (20-21)
  20: {
    title: 'Invalid Token Type',
    message: 'The token type is not supported or recognized.',
    action: 'Ensure you are using valid fungible asset tokens.',
  },
  21: {
    title: 'Token Registration Failed',
    message: 'Failed to register the token in the system.',
    action: 'Verify the token is properly deployed and try again.',
  },
};

/**
 * Parse a contract error from various error formats
 *
 * Handles errors from:
 * - Aptos SDK error responses
 * - Wallet adapter errors
 * - Network errors
 * - User rejections
 */
export function parseContractError(error: any): ContractError {
  // Handle user wallet rejections
  if (error?.code === 4001 || error?.message?.includes('User rejected')) {
    return {
      title: 'Transaction Rejected',
      message: 'You rejected the transaction in your wallet.',
      action: 'Approve the transaction in your wallet to proceed.',
    };
  }

  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return {
      title: 'Network Error',
      message: 'Failed to connect to the Movement Network.',
      action: 'Check your internet connection and try again.',
    };
  }

  // Handle timeout errors
  if (error?.message?.includes('timeout') || error?.message?.includes('timed out')) {
    return {
      title: 'Transaction Timeout',
      message: 'The transaction took too long to process.',
      action: 'Check network status and try again.',
    };
  }

  // Parse Aptos contract errors
  // Error format examples:
  // - "Move abort in 0x...::module: 0x7" (abort code 7)
  // - "module: 0x1" (error code 1)
  // - Contains hex error code that needs to be parsed

  const errorString = String(error?.message || error || '');

  // Try to extract error code from various formats
  let errorCode: number | null = null;

  // Pattern 1: "module: 0xN" or "factory: 0xN" or "pool: 0xN"
  const moduleErrorMatch = errorString.match(/(?:module|factory|pool|lp_token):\s*0x([0-9a-fA-F]+)/);
  if (moduleErrorMatch) {
    errorCode = parseInt(moduleErrorMatch[1], 16);
  }

  // Pattern 2: "Move abort ... 0xN"
  if (!errorCode) {
    const abortMatch = errorString.match(/Move abort.*?0x([0-9a-fA-F]+)/);
    if (abortMatch) {
      errorCode = parseInt(abortMatch[1], 16);
    }
  }

  // Pattern 3: "abort 0xN" or "ABORT_CODE 0xN"
  if (!errorCode) {
    const simpleAbortMatch = errorString.match(/(?:abort|ABORT_CODE)\s+0x([0-9a-fA-F]+)/i);
    if (simpleAbortMatch) {
      errorCode = parseInt(simpleAbortMatch[1], 16);
    }
  }

  // If we found an error code, return the mapped error
  if (errorCode !== null && CONTRACT_ERRORS[errorCode]) {
    return CONTRACT_ERRORS[errorCode];
  }

  // Handle insufficient balance errors (common wallet error)
  if (errorString.includes('insufficient') && errorString.includes('balance')) {
    return {
      title: 'Insufficient Balance',
      message: 'You do not have enough tokens for this transaction.',
      action: 'Check your token balance and reduce the amount.',
    };
  }

  // Handle transaction simulation failures
  if (errorString.includes('simulation') || errorString.includes('SEQUENCE_NUMBER')) {
    return {
      title: 'Transaction Failed',
      message: 'Transaction simulation failed. This often means the transaction would fail on-chain.',
      action: 'Check token balances, pool existence, and transaction parameters.',
    };
  }

  // Default error for unknown cases
  return {
    title: 'Transaction Failed',
    message: errorString || 'An unexpected error occurred.',
    action: 'Please check the transaction details and try again.',
  };
}

/**
 * Format error for display in toast notifications
 */
export function formatErrorForToast(error: any): string {
  const parsed = parseContractError(error);
  return parsed.action
    ? `${parsed.message} ${parsed.action}`
    : parsed.message;
}

/**
 * Check if an error is a specific contract error code
 */
export function isContractError(error: any, errorCode: number): boolean {
  const errorString = String(error?.message || error || '');
  const match = errorString.match(/0x([0-9a-fA-F]+)/);
  if (match) {
    const code = parseInt(match[1], 16);
    return code === errorCode;
  }
  return false;
}

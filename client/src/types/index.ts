export interface TokenInfo {
  name: string;
  symbol: string;
  type: string; // Full type path for Move contract
  decimals: number;
  logoUrl?: string;
}

export interface PoolInfo {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  reserveX: number;
  reserveY: number;
  lpSupply: number;
  address?: string;
}

export interface TransactionState {
  isPending: boolean;
  error: string | null;
  hash: string | null;
}

export interface SwapQuote {
  amountOut: number;
  priceImpact: number;
  executionPrice: number;
  minimumReceived: number;
}

export interface LiquidityQuote {
  lpTokens: number;
  poolShare: number;
  priceX: number;
  priceY: number;
}

export type TabType = 'swap' | 'liquidity' | 'pools';

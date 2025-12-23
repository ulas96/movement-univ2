import { FEE_NUMERATOR, FEE_DENOMINATOR, MINIMUM_LIQUIDITY } from "./constants";
import type { SwapQuote, LiquidityQuote } from "../types";

/**
 * Calculate output amount for a swap using constant product formula
 * Formula: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
 */
export function getAmountOut(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): number {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    return 0;
  }

  const amountInWithFee = amountIn * FEE_NUMERATOR;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * FEE_DENOMINATOR + amountInWithFee;

  return numerator / denominator;
}

/**
 * Calculate input amount needed for desired output
 * Formula: amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997)
 */
export function getAmountIn(
  amountOut: number,
  reserveIn: number,
  reserveOut: number
): number {
  if (amountOut <= 0 || reserveIn <= 0 || reserveOut <= amountOut) {
    return 0;
  }

  const numerator = reserveIn * amountOut * FEE_DENOMINATOR;
  const denominator = (reserveOut - amountOut) * FEE_NUMERATOR;

  return numerator / denominator;
}

/**
 * Calculate price impact of a swap
 * Returns percentage impact on price
 */
export function calculatePriceImpact(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): number {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    return 0;
  }

  // Spot price before trade
  const spotPrice = reserveOut / reserveIn;

  // Amount out from the swap
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);

  // Execution price
  const executionPrice = amountOut / amountIn;

  // Price impact percentage
  const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100;

  return Math.abs(priceImpact);
}

/**
 * Calculate complete swap quote with all details
 */
export function calculateSwapQuote(
  amountIn: number,
  reserveIn: number,
  reserveOut: number,
  slippageTolerance: number = 0.5
): SwapQuote {
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
  const priceImpact = calculatePriceImpact(amountIn, reserveIn, reserveOut);
  const executionPrice = amountOut / amountIn;
  const minimumReceived = amountOut * (1 - slippageTolerance / 100);

  return {
    amountOut,
    priceImpact,
    executionPrice,
    minimumReceived,
  };
}

/**
 * Calculate LP tokens to receive when adding liquidity
 * For existing pool: liquidity = min(amountX * totalSupply / reserveX, amountY * totalSupply / reserveY)
 * For new pool: liquidity = sqrt(amountX * amountY) - MINIMUM_LIQUIDITY
 */
export function calculateLPTokens(
  amountX: number,
  amountY: number,
  reserveX: number,
  reserveY: number,
  totalSupply: number
): number {
  if (amountX <= 0 || amountY <= 0) {
    return 0;
  }

  // If pool doesn't exist (reserves are 0)
  if (reserveX === 0 || reserveY === 0) {
    const liquidity = Math.sqrt(amountX * amountY) - MINIMUM_LIQUIDITY;
    return Math.max(0, liquidity);
  }

  // If pool exists, calculate proportional liquidity
  const liquidityX = (amountX * totalSupply) / reserveX;
  const liquidityY = (amountY * totalSupply) / reserveY;

  return Math.min(liquidityX, liquidityY);
}

/**
 * Calculate proportional amount of tokenY needed for given amountX
 */
export function calculateProportionalAmount(
  amount: number,
  reserveIn: number,
  reserveOut: number
): number {
  if (amount <= 0 || reserveIn <= 0) {
    return 0;
  }

  return (amount * reserveOut) / reserveIn;
}

/**
 * Calculate tokens to receive when removing liquidity
 */
export function calculateRemoveLiquidity(
  lpAmount: number,
  totalSupply: number,
  reserveX: number,
  reserveY: number
): { amountX: number; amountY: number } {
  if (lpAmount <= 0 || totalSupply <= 0) {
    return { amountX: 0, amountY: 0 };
  }

  const amountX = (lpAmount * reserveX) / totalSupply;
  const amountY = (lpAmount * reserveY) / totalSupply;

  return { amountX, amountY };
}

/**
 * Calculate pool share percentage
 */
export function calculatePoolShare(
  lpAmount: number,
  totalSupply: number
): number {
  if (totalSupply === 0) return 0;
  return (lpAmount / totalSupply) * 100;
}

/**
 * Calculate complete liquidity quote
 */
export function calculateLiquidityQuote(
  amountX: number,
  amountY: number,
  reserveX: number,
  reserveY: number,
  totalSupply: number
): LiquidityQuote {
  const lpTokens = calculateLPTokens(amountX, amountY, reserveX, reserveY, totalSupply);
  const newTotalSupply = totalSupply + lpTokens;
  const poolShare = calculatePoolShare(lpTokens, newTotalSupply);

  // Price of each token in terms of the other
  const priceX = reserveY > 0 ? reserveY / reserveX : 0;
  const priceY = reserveX > 0 ? reserveX / reserveY : 0;

  return {
    lpTokens,
    poolShare,
    priceX,
    priceY,
  };
}

/**
 * Square root implementation (for initial liquidity calculation)
 */
export function sqrt(value: number): number {
  if (value < 0) return 0;
  return Math.sqrt(value);
}

/**
 * Check if amounts are valid for adding liquidity
 */
export function isValidLiquidityAmount(
  amountX: number,
  amountY: number,
  reserveX: number,
  reserveY: number
): boolean {
  if (amountX <= 0 || amountY <= 0) return false;

  // For existing pool, check if ratio is approximately correct
  if (reserveX > 0 && reserveY > 0) {
    const expectedY = calculateProportionalAmount(amountX, reserveX, reserveY);
    const tolerance = 0.01; // 1% tolerance
    return Math.abs(amountY - expectedY) / expectedY <= tolerance;
  }

  return true;
}

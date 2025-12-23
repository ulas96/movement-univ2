import { useMemo } from "react";
import { calculateSwapQuote } from "../utils/calculations";
import { DEFAULT_SLIPPAGE } from "../utils/constants";

interface SwapQuoteParams {
  amountIn: number;
  reserveIn: number;
  reserveOut: number;
  slippage?: number;
}

export function useSwapQuote({
  amountIn,
  reserveIn,
  reserveOut,
  slippage = DEFAULT_SLIPPAGE,
}: SwapQuoteParams) {
  const quote = useMemo(() => {
    if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
      return {
        amountOut: 0,
        priceImpact: 0,
        executionPrice: 0,
        minimumReceived: 0,
      };
    }

    return calculateSwapQuote(amountIn, reserveIn, reserveOut, slippage);
  }, [amountIn, reserveIn, reserveOut, slippage]);

  return quote;
}

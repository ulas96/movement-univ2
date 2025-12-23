import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { FiArrowDown } from "react-icons/fi";
import toast from "react-hot-toast";
import { TokenSelect } from "./TokenSelect";
import { SlippageSettings } from "./SlippageSettings";
import type { TokenInfo } from "../types";
import { usePool } from "../hooks/usePool";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useSwapQuote } from "../hooks/useSwapQuote";
import { aptos } from "../utils/aptos";
import { FUNCTIONS, DEFAULT_SLIPPAGE, PRICE_IMPACT_THRESHOLDS } from "../utils/constants";
import { formatNumber, toContractAmount, sanitizeNumberInput } from "../utils/formatting";
import { parseContractError, formatErrorForToast } from "../utils/errors";

export function Swap() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [tokenX, setTokenX] = useState<TokenInfo | null>(null);
  const [tokenY, setTokenY] = useState<TokenInfo | null>(null);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [isPending, setIsPending] = useState(false);

  const { reserveX, reserveY, exists: poolExists, isLoading: poolLoading } = usePool(tokenX, tokenY);
  const { balance: balanceX, refresh: refreshBalanceX } = useTokenBalance(tokenX);
  const { balance: balanceY, refresh: refreshBalanceY } = useTokenBalance(tokenY);

  const amountInNum = parseFloat(amountIn) || 0;
  const quote = useSwapQuote({
    amountIn: amountInNum,
    reserveIn: reserveX,
    reserveOut: reserveY,
    slippage,
  });

  // Get ordered tokens (alphabetically) for contract calls
  function getOrderedTokens() {
    if (!tokenX || !tokenY) return null;
    const xName = tokenX.type.split("::").pop()!;
    const yName = tokenY.type.split("::").pop()!;
    return xName < yName ? { first: tokenX, second: tokenY, swapped: false } : { first: tokenY, second: tokenX, swapped: true };
  }

  // Handle swap direction flip
  const handleFlipTokens = () => {
    setTokenX(tokenY);
    setTokenY(tokenX);
    setAmountIn("");
  };

  // Handle swap transaction
  const handleSwap = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!tokenX || !tokenY) {
      toast.error("Please select both tokens");
      return;
    }

    if (!amountInNum || amountInNum <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    if (amountInNum > balanceX) {
      toast.error("Insufficient balance");
      return;
    }

    if (!poolExists) {
      toast.error("Pool does not exist");
      return;
    }

    if (quote.priceImpact > PRICE_IMPACT_THRESHOLDS.CRITICAL) {
      const confirmed = window.confirm(
        `Warning: Price impact is ${quote.priceImpact.toFixed(2)}% which is very high. Do you want to continue?`
      );
      if (!confirmed) return;
    }

    setIsPending(true);
    const toastId = toast.loading("Swapping tokens...");

    try {
      const ordered = getOrderedTokens();
      if (!ordered) throw new Error("Invalid token configuration");

      // Determine which function to use based on token order
      const isXtoY = !ordered.swapped;
      const functionName = isXtoY ? FUNCTIONS.SWAP_X_TO_Y : FUNCTIONS.SWAP_Y_TO_X;

      const transaction: InputTransactionData = {
        data: {
          function: functionName,
          typeArguments: [ordered.first.type, ordered.second.type] as any,
          functionArguments: [
            toContractAmount(amountInNum),
            toContractAmount(quote.minimumReceived),
          ],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      toast.success(`Successfully swapped ${formatNumber(amountInNum)} ${tokenX.symbol} for ${formatNumber(quote.amountOut)} ${tokenY.symbol}`, {
        id: toastId,
      });

      // Reset and refresh
      setAmountIn("");
      await Promise.all([refreshBalanceX(), refreshBalanceY()]);
    } catch (error: any) {
      console.error("Swap error:", error);
      const parsedError = parseContractError(error);
      toast.error(formatErrorForToast(error), { id: toastId });

      // Show detailed error in console for debugging
      console.error("Parsed error:", parsedError);
    } finally {
      setIsPending(false);
    }
  };

  // Get price impact color
  const getPriceImpactColor = () => {
    if (quote.priceImpact >= PRICE_IMPACT_THRESHOLDS.CRITICAL) return "text-error";
    if (quote.priceImpact >= PRICE_IMPACT_THRESHOLDS.HIGH) return "text-warning";
    if (quote.priceImpact >= PRICE_IMPACT_THRESHOLDS.MEDIUM) return "text-yellow-500";
    return "text-success";
  };

  const isSwapDisabled = !account || !tokenX || !tokenY || !amountInNum || amountInNum <= 0 || amountInNum > balanceX || !poolExists || isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Swap Tokens</h2>
        <SlippageSettings slippage={slippage} onSlippageChange={setSlippage} />
      </div>

      {/* From Token */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400">From</label>
        </div>
        <div className="bg-tertiary rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center gap-3">
            <input
              type="text"
              value={amountIn}
              onChange={(e) => setAmountIn(sanitizeNumberInput(e.target.value))}
              placeholder="0.0"
              className="bg-transparent text-2xl font-semibold text-white outline-none flex-1"
              disabled={isPending}
            />
            {tokenX && account && balanceX > 0 && (
              <button
                onClick={() => setAmountIn(balanceX.toString())}
                className="px-3 py-1 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                disabled={isPending}
              >
                MAX
              </button>
            )}
          </div>
          <TokenSelect selectedToken={tokenX} onSelect={setTokenX} excludeToken={tokenY ?? undefined} />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center -my-2">
        <button
          onClick={handleFlipTokens}
          className="p-2 bg-secondary border-4 border-primary rounded-xl hover:bg-tertiary transition-colors"
          disabled={isPending}
        >
          <FiArrowDown className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* To Token */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400">To (estimated)</label>
        </div>
        <div className="bg-tertiary rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-semibold text-white">
              {quote.amountOut > 0 ? formatNumber(quote.amountOut, 6) : "0.0"}
            </div>
          </div>
          <TokenSelect selectedToken={tokenY} onSelect={setTokenY} excludeToken={tokenX ?? undefined} />
        </div>
      </div>

      {/* Swap Details */}
      {tokenX && tokenY && amountInNum > 0 && poolExists && (
        <div className="bg-tertiary rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Rate</span>
            <span className="text-white">
              1 {tokenX.symbol} = {formatNumber(quote.executionPrice, 6)} {tokenY.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Price Impact</span>
            <span className={getPriceImpactColor()}>{formatNumber(quote.priceImpact, 2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Minimum Received</span>
            <span className="text-white">
              {formatNumber(quote.minimumReceived, 6)} {tokenY.symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-white">{slippage}%</span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={isSwapDisabled}
        className="btn-primary w-full"
      >
        {!account
          ? "Connect Wallet"
          : !tokenX || !tokenY
          ? "Select Tokens"
          : !poolExists && !poolLoading
          ? "Pool Does Not Exist"
          : poolLoading
          ? "Loading Pool..."
          : amountInNum > balanceX
          ? "Insufficient Balance"
          : isPending
          ? "Swapping..."
          : "Swap"}
      </button>
    </div>
  );
}

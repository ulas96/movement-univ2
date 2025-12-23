import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import type { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import toast from "react-hot-toast";
import { TokenSelect } from "./TokenSelect";
import type { TokenInfo } from "../types";
import { usePool } from "../hooks/usePool";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useLPBalance } from "../hooks/useLPBalance";
import { aptos } from "../utils/aptos";
import { FUNCTIONS } from "../utils/constants";
import { formatNumber, toContractAmount, sanitizeNumberInput } from "../utils/formatting";
import { calculateLiquidityQuote, calculateProportionalAmount, calculateRemoveLiquidity } from "../utils/calculations";
import { parseContractError, formatErrorForToast, isContractError } from "../utils/errors";

type LiquidityMode = "add" | "remove";

export function Liquidity() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [mode, setMode] = useState<LiquidityMode>("add");
  const [tokenX, setTokenX] = useState<TokenInfo | null>(null);
  const [tokenY, setTokenY] = useState<TokenInfo | null>(null);
  const [amountX, setAmountX] = useState("");
  const [amountY, setAmountY] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { reserveX, reserveY, exists: poolExists, refresh: refreshPool } = usePool(tokenX, tokenY);
  const { balance: balanceX, refresh: refreshBalanceX } = useTokenBalance(tokenX);
  const { balance: balanceY, refresh: refreshBalanceY } = useTokenBalance(tokenY);
  const { balance: lpBalance, totalSupply, poolShare, refresh: refreshLPBalance } = useLPBalance(tokenX, tokenY);

  const amountXNum = parseFloat(amountX) || 0;
  const amountYNum = parseFloat(amountY) || 0;
  const lpAmountNum = parseFloat(lpAmount) || 0;

  // Get ordered tokens
  function getOrderedTokens() {
    if (!tokenX || !tokenY) return null;
    const xName = tokenX.type.split("::").pop()!;
    const yName = tokenY.type.split("::").pop()!;
    return xName < yName ? { first: tokenX, second: tokenY } : { first: tokenY, second: tokenX };
  }

  // Calculate liquidity quote for adding
  const liquidityQuote = mode === "add" && poolExists
    ? calculateLiquidityQuote(amountXNum, amountYNum, reserveX, reserveY, totalSupply)
    : null;

  // Calculate amounts to receive when removing
  const removeQuote = mode === "remove" && lpAmountNum > 0
    ? calculateRemoveLiquidity(lpAmountNum, totalSupply, reserveX, reserveY)
    : null;

  // Auto-calculate proportional amount for existing pool
  useEffect(() => {
    if (mode === "add" && poolExists && reserveX > 0 && reserveY > 0) {
      if (amountXNum > 0 && !amountY) {
        const proportionalY = calculateProportionalAmount(amountXNum, reserveX, reserveY);
        setAmountY(proportionalY.toFixed(8));
      }
    }
  }, [amountXNum, mode, poolExists, reserveX, reserveY]);

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!tokenX || !tokenY) {
      toast.error("Please select both tokens");
      return;
    }

    if (!amountXNum || !amountYNum || amountXNum <= 0 || amountYNum <= 0) {
      toast.error("Please enter valid amounts");
      return;
    }

    if (amountXNum > balanceX || amountYNum > balanceY) {
      toast.error("Insufficient balance");
      return;
    }

    setIsPending(true);
    const toastId = toast.loading(!poolExists ? "Creating pool and adding liquidity..." : "Adding liquidity...");

    try {
      const ordered = getOrderedTokens();
      if (!ordered) throw new Error("Invalid token configuration");

      // If UI shows pool doesn't exist, create it first
      if (!poolExists) {
        console.log("Creating new pool for", ordered.first.symbol, "/", ordered.second.symbol);
        const createPoolTx: InputTransactionData = {
          data: {
            function: FUNCTIONS.CREATE_POOL,
            typeArguments: [ordered.first.type, ordered.second.type] as any,
            functionArguments: [],
          },
        };

        const createResponse = await signAndSubmitTransaction(createPoolTx);
        await aptos.waitForTransaction({ transactionHash: createResponse.hash });
        console.log("Pool created successfully");
        toast.success("Pool created! Now adding liquidity...", { id: toastId });
      }

      // Add liquidity to the pool
      const transaction: InputTransactionData = {
        data: {
          function: FUNCTIONS.ADD_LIQUIDITY,
          typeArguments: [ordered.first.type, ordered.second.type] as any,
          functionArguments: [
            toContractAmount(amountXNum),
            toContractAmount(amountYNum),
          ],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      toast.success(`Successfully added liquidity! Received ${formatNumber(liquidityQuote?.lpTokens || 0, 6)} LP tokens`, {
        id: toastId,
      });

      // Reset and refresh
      setAmountX("");
      setAmountY("");
      await Promise.all([refreshBalanceX(), refreshBalanceY(), refreshLPBalance(), refreshPool()]);
    } catch (error: any) {
      console.error("Add liquidity error:", error);
      const parsedError = parseContractError(error);
      toast.error(formatErrorForToast(error), { id: toastId });

      // Show detailed error in console for debugging
      console.error("Parsed error:", parsedError);
    } finally {
      setIsPending(false);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!account) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!tokenX || !tokenY) {
      toast.error("Please select both tokens");
      return;
    }

    if (!lpAmountNum || lpAmountNum <= 0) {
      toast.error("Please enter LP amount");
      return;
    }

    if (lpAmountNum > lpBalance) {
      toast.error("Insufficient LP balance");
      return;
    }

    setIsPending(true);
    const toastId = toast.loading("Removing liquidity...");

    try {
      const ordered = getOrderedTokens();
      if (!ordered) throw new Error("Invalid token configuration");

      const transaction: InputTransactionData = {
        data: {
          function: FUNCTIONS.REMOVE_LIQUIDITY,
          typeArguments: [ordered.first.type, ordered.second.type] as any,
          functionArguments: [toContractAmount(lpAmountNum)],
        },
      };

      const response = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: response.hash });

      toast.success(
        `Successfully removed liquidity! Received ${formatNumber(removeQuote?.amountX || 0)} ${tokenX.symbol} and ${formatNumber(removeQuote?.amountY || 0)} ${tokenY.symbol}`,
        { id: toastId }
      );

      // Reset and refresh
      setLpAmount("");
      await Promise.all([refreshBalanceX(), refreshBalanceY(), refreshLPBalance(), refreshPool()]);
    } catch (error: any) {
      console.error("Remove liquidity error:", error);
      const parsedError = parseContractError(error);
      toast.error(formatErrorForToast(error), { id: toastId });

      // Show detailed error in console for debugging
      console.error("Parsed error:", parsedError);
    } finally {
      setIsPending(false);
    }
  };

  const isAddDisabled = !account || !tokenX || !tokenY || !amountXNum || !amountYNum || amountXNum > balanceX || amountYNum > balanceY || isPending;
  const isRemoveDisabled = !account || !tokenX || !tokenY || !lpAmountNum || lpAmountNum > lpBalance || isPending;

  return (
    <div className="space-y-4">
      {/* Header with Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("add")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === "add" ? "bg-accent text-white" : "bg-tertiary text-gray-400 hover:text-white"
          }`}
        >
          Add
        </button>
        <button
          onClick={() => setMode("remove")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            mode === "remove" ? "bg-accent text-white" : "bg-tertiary text-gray-400 hover:text-white"
          }`}
        >
          Remove
        </button>
      </div>

      {mode === "add" ? (
        <>
          {/* Add Liquidity Mode */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-400">Token X</label>
              </div>
              <div className="bg-tertiary rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <input
                    type="text"
                    value={amountX}
                    onChange={(e) => setAmountX(sanitizeNumberInput(e.target.value))}
                    placeholder="0.0"
                    className="bg-transparent text-2xl font-semibold text-white outline-none flex-1"
                    disabled={isPending}
                  />
                  {tokenX && account && balanceX > 0 && (
                    <button
                      onClick={() => setAmountX(balanceX.toString())}
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm text-gray-400">Token Y</label>
              </div>
              <div className="bg-tertiary rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <input
                    type="text"
                    value={amountY}
                    onChange={(e) => setAmountY(sanitizeNumberInput(e.target.value))}
                    placeholder="0.0"
                    className="bg-transparent text-2xl font-semibold text-white outline-none flex-1"
                    disabled={isPending || (poolExists && amountXNum > 0)}
                  />
                  {tokenY && account && balanceY > 0 && !poolExists && (
                    <button
                      onClick={() => setAmountY(balanceY.toString())}
                      className="px-3 py-1 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                      disabled={isPending || (poolExists && amountXNum > 0)}
                    >
                      MAX
                    </button>
                  )}
                </div>
                <TokenSelect selectedToken={tokenY} onSelect={setTokenY} excludeToken={tokenX ?? undefined} />
              </div>
            </div>
          </div>

          {/* Liquidity Details */}
          {tokenX && tokenY && amountXNum > 0 && amountYNum > 0 && (
            <div className="bg-tertiary rounded-xl p-4 space-y-2 text-sm">
              {poolExists && liquidityQuote && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">LP Tokens to Receive</span>
                    <span className="text-white font-semibold">{formatNumber(liquidityQuote.lpTokens, 6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool Share</span>
                    <span className="text-white">{formatNumber(liquidityQuote.poolShare, 4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rate</span>
                    <span className="text-white">
                      1 {tokenX.symbol} = {formatNumber(liquidityQuote.priceX, 6)} {tokenY.symbol}
                    </span>
                  </div>
                </>
              )}
              {!poolExists && (
                <div className="text-center text-yellow-500 text-sm py-2">
                  You are creating a new pool! Set the initial price.
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleAddLiquidity}
            disabled={isAddDisabled}
            className="btn-primary w-full"
          >
            {!account
              ? "Connect Wallet"
              : !tokenX || !tokenY
              ? "Select Tokens"
              : amountXNum > balanceX || amountYNum > balanceY
              ? "Insufficient Balance"
              : isPending
              ? "Adding Liquidity..."
              : "Add Liquidity"}
          </button>
        </>
      ) : (
        <>
          {/* Remove Liquidity Mode */}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Select Token Pair</label>
              <div className="grid grid-cols-2 gap-3">
                <TokenSelect selectedToken={tokenX} onSelect={setTokenX} excludeToken={tokenY ?? undefined} />
                <TokenSelect selectedToken={tokenY} onSelect={setTokenY} excludeToken={tokenX ?? undefined} />
              </div>
            </div>

            {tokenX && tokenY && lpBalance > 0 && (
              <div className="bg-tertiary rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">LP Balance:</span>
                  <span className="text-white font-semibold">{formatNumber(lpBalance, 6)}</span>
                </div>

                <input
                  type="text"
                  value={lpAmount}
                  onChange={(e) => setLpAmount(sanitizeNumberInput(e.target.value))}
                  placeholder="0.0"
                  className="bg-transparent text-2xl font-semibold text-white outline-none w-full"
                  disabled={isPending}
                />

                {/* Percentage Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => setLpAmount(((lpBalance * percent) / 100).toFixed(8))}
                      className="py-1 px-2 bg-secondary hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-300 transition-colors"
                      disabled={isPending}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Remove Details */}
          {tokenX && tokenY && lpAmountNum > 0 && removeQuote && (
            <div className="bg-tertiary rounded-xl p-4 space-y-2 text-sm">
              <div className="text-gray-400 mb-2">You will receive:</div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tokenX.symbol}</span>
                <span className="text-white font-semibold">{formatNumber(removeQuote.amountX, 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{tokenY.symbol}</span>
                <span className="text-white font-semibold">{formatNumber(removeQuote.amountY, 6)}</span>
              </div>
            </div>
          )}

          {tokenX && tokenY && lpBalance === 0 && (
            <div className="bg-tertiary rounded-xl p-4 text-center text-gray-400">
              You don't have any LP tokens for this pair
            </div>
          )}

          <button
            onClick={handleRemoveLiquidity}
            disabled={isRemoveDisabled}
            className="btn-primary w-full"
          >
            {!account
              ? "Connect Wallet"
              : !tokenX || !tokenY
              ? "Select Token Pair"
              : lpBalance === 0
              ? "No LP Tokens"
              : lpAmountNum > lpBalance
              ? "Insufficient LP Balance"
              : isPending
              ? "Removing Liquidity..."
              : "Remove Liquidity"}
          </button>
        </>
      )}

      {/* Current Position */}
      {account && tokenX && tokenY && lpBalance > 0 && (
        <div className="bg-secondary rounded-xl p-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Your Position</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">LP Tokens</span>
              <span className="text-white">{formatNumber(lpBalance, 6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pool Share</span>
              <span className="text-white">{formatNumber(poolShare, 4)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

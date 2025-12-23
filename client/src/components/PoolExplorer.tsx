import { useState, useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { aptos } from "../utils/aptos";
import { FUNCTIONS, AVAILABLE_TOKENS } from "../utils/constants";
import type { PoolInfo } from "../types";
import { toDisplayAmount, formatNumber } from "../utils/formatting";

export function PoolExplorer() {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPools = async () => {
    setIsLoading(true);
    try {
      // For now, we'll check all possible token pairs from AVAILABLE_TOKENS
      const poolPromises = [];

      for (let i = 0; i < AVAILABLE_TOKENS.length; i++) {
        for (let j = i + 1; j < AVAILABLE_TOKENS.length; j++) {
          const tokenX = AVAILABLE_TOKENS[i];
          const tokenY = AVAILABLE_TOKENS[j];

          poolPromises.push(
            aptos
              .view({
                payload: {
                  function: FUNCTIONS.GET_RESERVES,
                  typeArguments: [tokenX.type, tokenY.type] as any,
                  functionArguments: [],
                },
              })
              .then((result) => {
                const reserveX = toDisplayAmount(result[0] as number);
                const reserveY = toDisplayAmount(result[1] as number);

                if (reserveX > 0 || reserveY > 0) {
                  // Fetch LP supply
                  return aptos
                    .view({
                      payload: {
                        function: FUNCTIONS.GET_SUPPLY,
                        typeArguments: [tokenX.type, tokenY.type] as any,
                        functionArguments: [],
                      },
                    })
                    .then((supplyResult) => {
                      const lpSupply = toDisplayAmount(supplyResult[0] as number);

                      return {
                        tokenX,
                        tokenY,
                        reserveX,
                        reserveY,
                        lpSupply,
                      };
                    });
                }
                return null;
              })
              .catch(() => null)
          );
        }
      }

      const results = await Promise.all(poolPromises);
      const validPools = results.filter((pool): pool is PoolInfo => pool !== null);

      setPools(validPools);
    } catch (error) {
      console.error("Error fetching pools:", error);
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">All Pools</h2>
        <button
          onClick={fetchPools}
          disabled={isLoading}
          className="p-2 hover:bg-tertiary rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <FiRefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && pools.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="mt-4 text-gray-400">Loading pools...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && pools.length === 0 && (
        <div className="bg-tertiary rounded-xl p-8 text-center">
          <p className="text-gray-400 mb-4">No pools found</p>
          <p className="text-sm text-gray-500">Create a pool by adding liquidity to a token pair</p>
        </div>
      )}

      {/* Pool List */}
      {pools.length > 0 && (
        <div className="space-y-3">
          {pools.map((pool, index) => (
            <div key={index} className="bg-tertiary rounded-xl p-4 hover:bg-opacity-80 transition-all">
              {/* Pool Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {pool.tokenX.symbol} / {pool.tokenY.symbol}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {pool.tokenX.name} - {pool.tokenY.name}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Total LP Supply</div>
                  <div className="text-white font-semibold">{formatNumber(pool.lpSupply, 2)}</div>
                </div>
              </div>

              {/* Pool Stats */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Reserve {pool.tokenX.symbol}</div>
                  <div className="text-white font-medium">{formatNumber(pool.reserveX, 4)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Reserve {pool.tokenY.symbol}</div>
                  <div className="text-white font-medium">{formatNumber(pool.reserveY, 4)}</div>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Rate</span>
                  <span className="text-white">
                    1 {pool.tokenX.symbol} = {formatNumber(pool.reserveY / pool.reserveX, 6)}{" "}
                    {pool.tokenY.symbol}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {pools.length > 0 && (
        <div className="bg-secondary rounded-xl p-4 mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Total Pools</div>
              <div className="text-white font-semibold text-lg">{pools.length}</div>
            </div>
            <div>
              <div className="text-gray-400">Total LP Supply</div>
              <div className="text-white font-semibold text-lg">
                {formatNumber(
                  pools.reduce((sum, pool) => sum + pool.lpSupply, 0),
                  2
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

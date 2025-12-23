import { useState, useEffect, useCallback } from "react";
import { aptos } from "../utils/aptos";
import { FUNCTIONS } from "../utils/constants";
import type { TokenInfo } from "../types";
import { toDisplayAmount } from "../utils/formatting";

interface PoolData {
  reserveX: number;
  reserveY: number;
  timestamp: number;
  exists: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePool(tokenX: TokenInfo | null, tokenY: TokenInfo | null) {
  const [poolData, setPoolData] = useState<PoolData>({
    reserveX: 0,
    reserveY: 0,
    timestamp: 0,
    exists: false,
    isLoading: false,
    error: null,
  });

  const fetchPool = useCallback(async () => {
    if (!tokenX || !tokenY) {
      setPoolData({
        reserveX: 0,
        reserveY: 0,
        timestamp: 0,
        exists: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    setPoolData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if pool exists by trying to get reserves
      // (exists_pool is not a view function, so we use get_reserves instead)
      const result = await aptos.view({
        payload: {
          function: FUNCTIONS.GET_RESERVES,
          typeArguments: [tokenX.type, tokenY.type] as any,
          functionArguments: [],
        },
      });

      const reserveX = toDisplayAmount(result[0] as number);
      const reserveY = toDisplayAmount(result[1] as number);
      const timestamp = Number(result[2]);

      setPoolData({
        reserveX,
        reserveY,
        timestamp,
        exists: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // get_reserves failed - pool doesn't exist
      console.log("Pool doesn't exist (get_reserves failed):", error.message);
      setPoolData({
        reserveX: 0,
        reserveY: 0,
        timestamp: 0,
        exists: false,
        isLoading: false,
        error: null,
      });
    }
  }, [tokenX, tokenY]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  return { ...poolData, refresh: fetchPool };
}

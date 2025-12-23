import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptos } from "../utils/aptos";
import { FUNCTIONS } from "../utils/constants";
import type { TokenInfo } from "../types";
import { toDisplayAmount } from "../utils/formatting";

interface LPBalanceData {
  balance: number;
  totalSupply: number;
  poolShare: number;
  isLoading: boolean;
}

export function useLPBalance(tokenX: TokenInfo | null, tokenY: TokenInfo | null) {
  const { account } = useWallet();
  const [lpData, setLPData] = useState<LPBalanceData>({
    balance: 0,
    totalSupply: 0,
    poolShare: 0,
    isLoading: false,
  });

  const fetchLPBalance = useCallback(async () => {
    if (!account || !tokenX || !tokenY) {
      setLPData({
        balance: 0,
        totalSupply: 0,
        poolShare: 0,
        isLoading: false,
      });
      return;
    }

    setLPData((prev) => ({ ...prev, isLoading: true }));

    try {
      // Fetch LP token balance
      const balanceResult = await aptos.view({
        payload: {
          function: FUNCTIONS.GET_BALANCE,
          typeArguments: [tokenX.type, tokenY.type] as any,
          functionArguments: [account.address.toString()],
        },
      });

      // Fetch total LP supply
      const supplyResult = await aptos.view({
        payload: {
          function: FUNCTIONS.GET_SUPPLY,
          typeArguments: [tokenX.type, tokenY.type] as any,
          functionArguments: [],
        },
      });

      const balance = toDisplayAmount(balanceResult[0] as number);
      const totalSupply = toDisplayAmount(supplyResult[0] as number);
      const poolShare = totalSupply > 0 ? (balance / totalSupply) * 100 : 0;

      setLPData({
        balance,
        totalSupply,
        poolShare,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching LP balance:", error);
      setLPData({
        balance: 0,
        totalSupply: 0,
        poolShare: 0,
        isLoading: false,
      });
    }
  }, [account, tokenX, tokenY]);

  useEffect(() => {
    fetchLPBalance();
  }, [fetchLPBalance]);

  return { ...lpData, refresh: fetchLPBalance };
}

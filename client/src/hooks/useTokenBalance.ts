import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { aptos } from "../utils/aptos";
import type { TokenInfo } from "../types";
import { toDisplayAmount } from "../utils/formatting";

export function useTokenBalance(token: TokenInfo | null) {
  const { account } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!account || !token) {
      setBalance(0);
      return;
    }

    setIsLoading(true);
    try {
      // Extract the token address and module name from the type path
      // Format: 0xADDRESS::module::Token
      const [tokenAddress, moduleName] = token.type.split("::");

      console.log(`[useTokenBalance] Fetching balance for ${token.symbol}`);
      console.log(`[useTokenBalance] Token type: ${token.type}`);
      console.log(`[useTokenBalance] Account: ${account.address.toString()}`);

      // Get the metadata object by calling the get_metadata view function
      // Each token module has a get_metadata() view function that returns Object<Metadata>
      const metadataResult = await aptos.view({
        payload: {
          function: `${tokenAddress}::${moduleName}::get_metadata` as any,
          typeArguments: [],
          functionArguments: [],
        },
      });

      // Extract metadata address from the returned object
      // The SDK returns Object types as {inner: "0x..."}
      let metadataAddress: string;
      const rawMetadata = metadataResult[0];

      if (typeof rawMetadata === 'string') {
        metadataAddress = rawMetadata;
      } else if (rawMetadata && typeof rawMetadata === 'object') {
        // Extract from common object patterns (SDK returns {inner: "0x..."})
        metadataAddress = (rawMetadata as any).inner ||
                         (rawMetadata as any).vec?.[0] ||
                         (rawMetadata as any).data ||
                         String(rawMetadata);
      } else {
        metadataAddress = String(rawMetadata);
      }

      console.log(`[useTokenBalance] Metadata address: ${metadataAddress}`);

      // Now get the primary fungible store balance for this account and metadata
      // Use the primary_fungible_store::balance view function with Metadata type argument
      const balanceResult = await aptos.view({
        payload: {
          function: "0x1::primary_fungible_store::balance" as any,
          typeArguments: ["0x1::fungible_asset::Metadata"],
          functionArguments: [account.address.toString(), metadataAddress],
        },
      });

      const tokenBalance = Number(balanceResult[0]);
      console.log(`[useTokenBalance] Raw balance: ${tokenBalance}`);
      console.log(`[useTokenBalance] Display balance: ${toDisplayAmount(tokenBalance)}`);

      setBalance(toDisplayAmount(tokenBalance));
    } catch (error: any) {
      console.error(`[useTokenBalance] Error fetching token balance for ${token?.symbol}:`, error);
      console.error(`[useTokenBalance] Error details:`, error.message);
      // If error, token might not be initialized for this account, balance is 0
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [account, token]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, refresh: fetchBalance };
}

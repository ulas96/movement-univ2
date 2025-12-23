import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { NETWORK_CONFIG } from "./constants";

// Configure Aptos SDK for Movement Network
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: NETWORK_CONFIG.fullnode,
});

// Export configured Aptos client instance
export const aptos = new Aptos(aptosConfig);

// Helper function to format account address
export function formatAddress(address: string, start = 6, end = 4): string {
  if (!address) return "";
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// Helper to check if address is valid
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

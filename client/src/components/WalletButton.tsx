import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { truncateAddress } from "../utils/formatting";

export function WalletButton() {
  const { account, connected } = useWallet();

  if (connected && account) {
    return <WalletSelector />;
  }

  return <WalletSelector />;
}

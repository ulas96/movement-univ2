import { useState } from "react";
import { WalletButton } from "./components/WalletButton";
import { Swap } from "./components/Swap";
import { Liquidity } from "./components/Liquidity";
import { PoolExplorer } from "./components/PoolExplorer";
import type { TabType } from "./types";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("swap");

  return (
    <div className="min-h-screen bg-primary">
      {/* Navbar */}
      <nav className="bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                Movement <span className="text-accent">DEX</span>
              </h1>
            </div>

            {/* Wallet Button */}
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-secondary p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("swap")}
              className={`flex-1 tab-button ${
                activeTab === "swap" ? "tab-active" : "tab-inactive"
              }`}
            >
              Swap
            </button>
            <button
              onClick={() => setActiveTab("liquidity")}
              className={`flex-1 tab-button ${
                activeTab === "liquidity" ? "tab-active" : "tab-inactive"
              }`}
            >
              Liquidity
            </button>
            <button
              onClick={() => setActiveTab("pools")}
              className={`flex-1 tab-button ${
                activeTab === "pools" ? "tab-active" : "tab-inactive"
              }`}
            >
              Pools
            </button>
          </div>

          {/* Tab Content */}
          <div className="card">
            {activeTab === "swap" && <Swap />}
            {activeTab === "liquidity" && <Liquidity />}
            {activeTab === "pools" && <PoolExplorer />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-secondary border-t border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Movement Network Testnet</span>
            <a
              href="https://movementnetwork.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

import { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { TokenInfo } from "../types";
import { AVAILABLE_TOKENS } from "../utils/constants";
import { formatNumber } from "../utils/formatting";
import { useTokenBalance } from "../hooks/useTokenBalance";

interface TokenSelectProps {
  selectedToken: TokenInfo | null;
  onSelect: (token: TokenInfo) => void;
  excludeToken?: TokenInfo;
  label?: string;
}

export function TokenSelect({
  selectedToken,
  onSelect,
  excludeToken,
  label = "Select Token",
}: TokenSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { balance } = useTokenBalance(selectedToken);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter out excluded token
  const availableTokens = AVAILABLE_TOKENS.filter(
    (token) => !excludeToken || token.type !== excludeToken.type
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Token Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-tertiary rounded-xl border border-border hover:border-accent transition-colors"
      >
        {selectedToken ? (
          <div className="flex items-center gap-2">
            {selectedToken.logoUrl && (
              <img
                src={selectedToken.logoUrl}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full"
              />
            )}
            <div className="text-left">
              <div className="font-semibold text-white">{selectedToken.symbol}</div>
              <div className="text-xs text-gray-400">{selectedToken.name}</div>
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{label}</span>
        )}
        <FiChevronDown
          className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Balance Display */}
      {selectedToken && (
        <div className="mt-1 text-xs text-gray-400">
          Balance: {formatNumber(balance, 6)}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-secondary rounded-xl border border-border shadow-xl z-50 overflow-hidden">
          {availableTokens.map((token) => (
            <button
              key={token.type}
              onClick={() => {
                onSelect(token);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-tertiary transition-colors text-left"
            >
              {token.logoUrl && (
                <img src={token.logoUrl} alt={token.symbol} className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-white">{token.symbol}</div>
                <div className="text-xs text-gray-400">{token.name}</div>
              </div>
            </button>
          ))}
          {availableTokens.length === 0 && (
            <div className="px-4 py-3 text-center text-gray-400 text-sm">No tokens available</div>
          )}
        </div>
      )}
    </div>
  );
}

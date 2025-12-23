import { useState } from "react";
import { FiSettings, FiX } from "react-icons/fi";

interface SlippageSettingsProps {
  slippage: number;
  onSlippageChange: (slippage: number) => void;
}

export function SlippageSettings({ slippage, onSlippageChange }: SlippageSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [activePreset, setActivePreset] = useState<number | null>(slippage);

  const presets = [0.1, 0.5, 1.0];

  const handlePresetClick = (value: number) => {
    setActivePreset(value);
    onSlippageChange(value);
    setCustomValue("");
  };

  const handleCustomChange = (value: string) => {
    setCustomValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      setActivePreset(null);
      onSlippageChange(numValue);
    }
  };

  const getWarningColor = () => {
    if (slippage > 5) return "text-error";
    if (slippage > 3) return "text-warning";
    return "text-gray-400";
  };

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-tertiary rounded-lg transition-colors"
        title="Slippage Settings"
      >
        <FiSettings className="w-5 h-5 text-gray-400 hover:text-white" />
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-secondary rounded-xl border border-border shadow-2xl z-50 p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Slippage Tolerance</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-tertiary rounded transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Presets */}
            <div className="flex gap-2 mb-4">
              {presets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                    activePreset === preset
                      ? "bg-accent text-white"
                      : "bg-tertiary text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Custom Slippage (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={customValue}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="0.50"
                className="input-field text-right"
              />
            </div>

            {/* Current Value Display */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Current Slippage:</span>
              <span className={`font-semibold ${getWarningColor()}`}>{slippage.toFixed(2)}%</span>
            </div>

            {/* Warnings */}
            {slippage > 5 && (
              <div className="mt-3 p-3 bg-error bg-opacity-10 border border-error rounded-lg">
                <p className="text-sm text-error">
                  High slippage tolerance! Your transaction may be frontrun.
                </p>
              </div>
            )}
            {slippage > 3 && slippage <= 5 && (
              <div className="mt-3 p-3 bg-warning bg-opacity-10 border border-warning rounded-lg">
                <p className="text-sm text-warning">
                  Slippage tolerance is high. Proceed with caution.
                </p>
              </div>
            )}
            {slippage < 0.1 && (
              <div className="mt-3 p-3 bg-warning bg-opacity-10 border border-warning rounded-lg">
                <p className="text-sm text-warning">
                  Very low slippage may cause transaction to fail.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { DECIMAL_MULTIPLIER } from "./constants";

/**
 * Convert user display amount to contract format (with 8 decimals)
 * Example: 1.5 tokens -> 150000000
 */
export function toContractAmount(displayAmount: number | string): string {
  const amount = typeof displayAmount === "string" ? parseFloat(displayAmount) : displayAmount;
  if (isNaN(amount)) return "0";
  return Math.floor(amount * DECIMAL_MULTIPLIER).toString();
}

/**
 * Convert contract amount to user display format
 * Example: 150000000 -> 1.5
 */
export function toDisplayAmount(contractAmount: number | string): number {
  const amount = typeof contractAmount === "string" ? parseFloat(contractAmount) : contractAmount;
  if (isNaN(amount)) return 0;
  return amount / DECIMAL_MULTIPLIER;
}

/**
 * Format number with specified decimal places
 */
export function formatNumber(value: number, decimals = 6): string {
  if (isNaN(value)) return "0";

  // For very small numbers, use scientific notation
  if (value > 0 && value < 0.000001) {
    return value.toExponential(4);
  }

  // Format with commas and decimals
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format as currency with $ sign
 */
export function formatCurrency(value: number, decimals = 2): string {
  if (isNaN(value)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercent(value: number, decimals = 2): string {
  if (isNaN(value)) return "0%";
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Truncate address
 */
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return "";
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(value: number): string {
  if (isNaN(value)) return "0";

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return formatNumber(value, 2);
}

/**
 * Validate numeric input
 */
export function isValidNumber(value: string): boolean {
  if (!value || value === "") return false;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && isFinite(num);
}

/**
 * Sanitize numeric input (remove invalid characters)
 */
export function sanitizeNumberInput(value: string): string {
  // Remove all non-numeric characters except decimal point
  let sanitized = value.replace(/[^0-9.]/g, "");

  // Ensure only one decimal point
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }

  return sanitized;
}

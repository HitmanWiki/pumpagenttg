// src/lib/utils.ts

// Helper to serialize BigInt values for JSON responses
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

// Helper to safely convert BigInt to number
export function bigIntToNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  return value;
}

// Helper to convert lamports to SOL
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / 1e9;
}

// Helper to format SOL for display
export function formatSol(lamports: bigint | number): string {
  return lamportsToSol(lamports).toFixed(4);
}

// ============================================================
// Address Formatting Utilities
// ============================================================

/**
 * Format a generic address (no suffix)
 * @param address - The address to format
 * @param prefixLength - Number of characters to show at the start (default: 8)
 * @param suffixLength - Number of characters to show at the end (default: 4)
 * @returns Formatted address like "7fZK58DP...XyZ"
 */
export function formatAddress(address: string, prefixLength: number = 8, suffixLength: number = 4): string {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Format a mint address (Contract Address) with "pump" suffix
 * @param address - The mint address to format
 * @returns Formatted address like "GPa1XpFV...pump"
 */
export function formatMintAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return `${address}pump`;
  return `${address.slice(0, 8)}...${address.slice(-4)}pump`;
}

/**
 * Short address for token cards (8 chars + 6 chars)
 * @param address - The address to format
 * @returns Formatted address like "7fZK58DP...XyZabc"
 */
export function shortAddr(address: string): string {
  return formatAddress(address, 8, 6);
}

/**
 * Very short address for leaderboard (6 chars + 4 chars)
 * @param address - The address to format
 * @returns Formatted address like "7fZK58...XyZ"
 */
export function veryShortAddr(address: string): string {
  return formatAddress(address, 6, 4);
}
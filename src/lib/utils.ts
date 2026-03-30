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
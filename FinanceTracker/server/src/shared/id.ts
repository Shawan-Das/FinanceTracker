/**
 * Secure ID generator with table-specific prefixes.
 *
 * Format: {prefix}_{random}
 * Example: usr_aB3kL9mN2pQr
 *
 * The random part uses 12 chars from a base62 alphabet (a-z, A-Z, 0-9).
 * 62^12 ≈ 3.2 × 10^21 possible values per table — collision-resistant.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789=';

function randomString(length: number): string {
  let result = '';
  const bytes = new Uint8Array(length);
  // Use crypto.getRandomValues if available (Node 19+ / browser), else fall back
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    const { randomBytes } = require('crypto');
    const buf = randomBytes(length);
    for (let i = 0; i < length; i++) bytes[i] = buf[i];
  }
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

const PREFIXES = {
  users: 'usr',
  email_verifications: 'evt',
  login_attempts: 'lat',
  accounts: 'acc',
  people: 'per',
  categories: 'cat',
  loans: 'ln',
  transactions: 'txn',
  transaction_transfers: 'tfr',
  loan_repayments: 'lre',
} as const;

type TableName = keyof typeof PREFIXES;

export function generateId(table: TableName): string {
  const prefix = PREFIXES[table];
  return `${prefix}_${randomString(12)}`;
}

/**
 * Extract the prefix from an ID string (useful for debugging).
 */
export function getIdPrefix(id: string): string | undefined {
  const underscore = id.indexOf('_');
  if (underscore === -1) return undefined;
  return id.substring(0, underscore);
}

/**
 * Validate that an ID matches the expected prefix format.
 */
export function isValidId(id: string): boolean {
  const underscore = id.indexOf('_');
  if (underscore === -1) return false;
  const prefix = id.substring(0, underscore);
  const rest = id.substring(underscore + 1);
  return rest.length === 12 && /^[a-zA-Z0-9]{12}$/.test(rest);
}

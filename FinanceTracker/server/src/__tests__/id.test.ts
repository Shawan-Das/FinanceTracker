import { describe, it, expect } from 'vitest';
import { generateId, getIdPrefix, isValidId } from '../shared/id';

// =============================================================================
// generateId
// =============================================================================

describe('generateId', () => {
  it('generates an ID with the correct prefix for each table', () => {
    const userId = generateId('users');
    expect(userId.startsWith('usr_')).toBe(true);

    const accId = generateId('accounts');
    expect(accId.startsWith('acc_')).toBe(true);

    const personId = generateId('people');
    expect(personId.startsWith('per_')).toBe(true);

    const catId = generateId('categories');
    expect(catId.startsWith('cat_')).toBe(true);

    const loanId = generateId('loans');
    expect(loanId.startsWith('ln_')).toBe(true);

    const txId = generateId('transactions');
    expect(txId.startsWith('txn_')).toBe(true);

    const tfrId = generateId('transaction_transfers');
    expect(tfrId.startsWith('tfr_')).toBe(true);

    const lreId = generateId('loan_repayments');
    expect(lreId.startsWith('lre_')).toBe(true);

    const evtId = generateId('email_verifications');
    expect(evtId.startsWith('evt_')).toBe(true);

    const latId = generateId('login_attempts');
    expect(latId.startsWith('lat_')).toBe(true);
  });

  it('generates IDs of consistent length', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateId('accounts');
      // prefix + underscore + 12 random chars
      expect(id.length).toBe('acc'.length + 1 + 12);
    }
  });

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) {
      ids.add(generateId('transactions'));
    }
    // With 200 IDs, all should be unique (collision probability is negligible)
    expect(ids.size).toBe(200);
  });

  it('generated IDs contain only valid characters', () => {
    const validChars = /^[a-zA-Z0-9]+$/;
    for (let i = 0; i < 100; i++) {
      const id = generateId('accounts');
      const randomPart = id.split('_')[1];
      expect(validChars.test(randomPart)).toBe(true);
    }
  });
});

// =============================================================================
// getIdPrefix
// =============================================================================

describe('getIdPrefix', () => {
  it('extracts the prefix from a valid ID', () => {
    expect(getIdPrefix('usr_aB3kL9mN2pQr')).toBe('usr');
    expect(getIdPrefix('acc_xY7kM3nR9pQw')).toBe('acc');
    expect(getIdPrefix('txn_1234567890ab')).toBe('txn');
  });

  it('returns undefined for IDs without underscore', () => {
    expect(getIdPrefix('noUnderscore')).toBeUndefined();
    expect(getIdPrefix('12345')).toBeUndefined();
  });

  it('returns empty string for ID starting with underscore', () => {
    expect(getIdPrefix('_abc123')).toBe('');
  });
});

// =============================================================================
// isValidId
// =============================================================================

describe('isValidId', () => {
  it('returns true for valid IDs with correct format', () => {
    expect(isValidId('acc_aB3kL9mN2pQr')).toBe(true);
    expect(isValidId('usr_xY7kM3nR9pQw')).toBe(true);
    expect(isValidId('txn_1234567890ab')).toBe(true);
  });

  it('returns false for IDs without underscore', () => {
    expect(isValidId('noUnderscore')).toBe(false);
  });

  it('returns false for IDs with random part too short', () => {
    expect(isValidId('acc_short')).toBe(false);
    expect(isValidId('acc_1234')).toBe(false);
  });

  it('returns false for IDs with random part too long', () => {
    expect(isValidId('acc_aB3kL9mN2pQrExtra')).toBe(false);
  });

  it('returns false for IDs with invalid characters in random part', () => {
    expect(isValidId('acc_aB3kL9mN2p!r')).toBe(false);
    expect(isValidId('acc_aB3kL9mN2p r')).toBe(false);
    expect(isValidId('acc_aB3kL9mN2p-r')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidId('')).toBe(false);
  });

  it('returns true for IDs with only alphanumeric random part', () => {
    expect(isValidId('per_ABCdef012345')).toBe(true);
    expect(isValidId('ln_abcdefghijklmnopqrstuvwxyz')).toBe(false); // 26 chars, not 12
  });

  it('generated IDs always pass validation', () => {
    const tables = ['users', 'accounts', 'people', 'categories', 'loans', 'transactions', 'transaction_transfers', 'loan_repayments', 'email_verifications', 'login_attempts'] as const;
    for (const table of tables) {
      for (let i = 0; i < 20; i++) {
        const id = generateId(table);
        expect(isValidId(id)).toBe(true);
      }
    }
  });
});

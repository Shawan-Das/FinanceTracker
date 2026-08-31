// =============================================================================
// Voucher & Invoice Report Types
// =============================================================================

export type VoucherType = 'receipt' | 'invoice' | 'voucher';

export interface VoucherData {
  id: string;
  transaction_type: string;
  transaction_date: string | Date;
  amount: number | string;
  description: string | null;
  reference: string | null;
  account_name: string | null;
  person_name: string | null;
  category_name: string | null;
  user_name?: string;
  user_email?: string;
  from_account_name?: string | null;
  to_account_name?: string | null;
}

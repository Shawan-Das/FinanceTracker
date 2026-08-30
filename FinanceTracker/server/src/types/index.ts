export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  default_currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: 'BANK' | 'CASH' | 'MOBILE_WALLET' | 'OTHER';
  currency: string;
  opening_balance: number;
  opening_balance_date: string;
  is_active: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  account_id: string | null;
  person_id: string | null;
  category_id: string | null;
  loan_id: string | null;
  description: string | null;
  reference: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'LEND'
  | 'LEND_REPAYMENT'
  | 'BORROW'
  | 'BORROW_REPAYMENT'
  | 'ADJUSTMENT';

export interface TransactionTransfer {
  id: string;
  transaction_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  created_at: Date;
}

export interface Loan {
  id: string;
  user_id: string;
  person_id: string | null;
  direction: 'BORROWED' | 'LENT';
  principal_amount: number;
  interest_amount: number;
  start_date: string;
  due_date: string | null;
  status: 'ACTIVE' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  transaction_id: string | null;
  amount: number;
  repayment_date: string;
  notes: string | null;
  created_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  default_currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: number;
  user_id: number;
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
  id: number;
  user_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: number;
  user_id: number;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  account_id: number | null;
  person_id: number | null;
  category_id: number | null;
  loan_id: number | null;
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
  id: number;
  transaction_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  created_at: Date;
}

export interface Loan {
  id: number;
  user_id: number;
  person_id: number | null;
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
  id: number;
  loan_id: number;
  transaction_id: number | null;
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

// Extend Express Session
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

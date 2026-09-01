export interface User {
  id: string;
  full_name: string;
  email: string;
  default_currency: string;
  created_at: string;
}

export interface Account {
  account_id: string;
  user_id: string;
  name: string;
  account_name: string;
  account_type: 'BANK' | 'CASH' | 'MOBILE_WALLET' | 'OTHER';
  currency: string;
  opening_balance: number;
  opening_balance_date: string;
  current_balance: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  amount_they_owe_you: number;
  amount_you_owe_them: number;
  total_lent?: number;
  total_lent_repaid?: number;
  total_borrowed?: number;
  total_borrow_repaid?: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  account_id: string | null;
  account_name?: string;
  person_id: string | null;
  person_name?: string;
  category_id: string | null;
  category_name?: string;
  loan_id: string | null;
  description: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
  transfer?: TransferDetail;
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

export interface TransferDetail {
  from_account_id: string;
  to_account_id: string;
  from_account_name: string;
  to_account_name: string;
  amount: number;
}

export interface Loan {
  id: string;
  user_id: string;
  person_id: string | null;
  person_name?: string;
  direction: 'BORROWED' | 'LENT';
  principal_amount: number;
  interest_amount: number;
  total_repaid: number;
  remaining_amount: number;
  start_date: string;
  due_date: string | null;
  status: 'ACTIVE' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  description: string | null;
  source?: 'MANUAL' | 'AUTO';
  repayments?: LoanRepayment[];
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  transaction_id: string | null;
  amount: number;
  repayment_date: string;
  account_name?: string;
  notes: string | null;
}

export interface DashboardSummary {
  accounts: Account[];
  totalAccountBalance: number;
  totalReceivable: number;
  totalPayable: number;
  totalIncome: number;
  totalExpense: number;
  netPosition: number;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
}

export interface ExpenseByCategory {
  category_name: string;
  color: string | null;
  total: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  pagination?: Pagination;
}

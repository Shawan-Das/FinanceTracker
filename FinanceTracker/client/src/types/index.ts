export interface User {
  id: number;
  full_name: string;
  email: string;
  default_currency: string;
  created_at: string;
}

export interface Account {
  account_id: number;
  user_id: number;
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
  id: number;
  user_id: number;
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
  id: number;
  user_id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string | null;
  color: string | null;
  is_active: boolean;
}

export interface Transaction {
  id: number;
  user_id: number;
  transaction_type: TransactionType;
  transaction_date: string;
  amount: number;
  account_id: number | null;
  account_name?: string;
  person_id: number | null;
  person_name?: string;
  category_id: number | null;
  category_name?: string;
  loan_id: number | null;
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
  from_account_id: number;
  to_account_id: number;
  from_account_name: string;
  to_account_name: string;
  amount: number;
}

export interface Loan {
  id: number;
  user_id: number;
  person_id: number | null;
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
  repayments?: LoanRepayment[];
}

export interface LoanRepayment {
  id: number;
  loan_id: number;
  transaction_id: number | null;
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

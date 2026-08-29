import axios from 'axios';
import toast from 'react-hot-toast';

// In development, Vite proxy handles /api → localhost:3001
// In production, VITE_API_URL points to the deployed backend
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'An error occurred';

      // Only show toast for non-401 errors
      // 401 is handled by AuthContext (not logged in = expected)
      if (status !== 401) {
        toast.error(message);
      }
    } else {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// Auth API
// =============================================================================
export const authApi = {
  register: (data: { full_name: string; email: string; password: string; confirm_password: string }) =>
    api.post('/auth/register', data),
  verifyEmail: (data: { email: string; code: string }) =>
    api.post('/auth/verify-email', data),
  resendVerification: (data: { email: string }) =>
    api.post('/auth/resend-verification', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { email: string; code: string; password: string; confirm_password: string }) =>
    api.post('/auth/reset-password', data),
};

// =============================================================================
// Accounts API
// =============================================================================
export const accountsApi = {
  list: () => api.get('/accounts'),
  get: (id: string) => api.get(`/accounts/${id}`),
  create: (data: any) => api.post('/accounts', data),
  update: (id: string, data: any) => api.patch(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
  transactions: (id: string, params?: any) => api.get(`/accounts/${id}/transactions`, { params }),
};

// =============================================================================
// People API
// =============================================================================
export const peopleApi = {
  list: () => api.get('/people'),
  get: (id: string) => api.get(`/people/${id}`),
  create: (data: any) => api.post('/people', data),
  update: (id: string, data: any) => api.patch(`/people/${id}`, data),
  delete: (id: string) => api.delete(`/people/${id}`),
  transactions: (id: string, params?: any) => api.get(`/people/${id}/transactions`, { params }),
};

// =============================================================================
// Categories API
// =============================================================================
export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// =============================================================================
// Transactions API
// =============================================================================
export const transactionsApi = {
  list: (params?: any) => api.get('/transactions', { params }),
  get: (id: string) => api.get(`/transactions/${id}`),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.patch(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

// =============================================================================
// Loans API
// =============================================================================
export const loansApi = {
  list: () => api.get('/loans'),
  get: (id: string) => api.get(`/loans/${id}`),
  create: (data: any) => api.post('/loans', data),
  update: (id: string, data: any) => api.patch(`/loans/${id}`, data),
  delete: (id: string) => api.delete(`/loans/${id}`),
  repayments: (id: string) => api.get(`/loans/${id}/repayments`),
  createRepayment: (id: string, data: any) => api.post(`/loans/${id}/repayments`, data),
};

// =============================================================================
// Dashboard API
// =============================================================================
export const dashboardApi = {
  summary: (params?: any) => api.get('/dashboard/summary', { params }),
  recentTransactions: () => api.get('/dashboard/recent-transactions'),
  peopleSummary: () => api.get('/dashboard/people-summary'),
  loanSummary: () => api.get('/dashboard/loan-summary'),
  monthlyChart: () => api.get('/dashboard/monthly-chart'),
  expenseByCategory: (params?: any) => api.get('/dashboard/expense-by-category', { params }),
};

// =============================================================================
// Reports API
// =============================================================================
export const reportsApi = {
  income: (params?: any) => api.get('/reports/income', { params }),
  expense: (params?: any) => api.get('/reports/expense', { params }),
  accountStatement: (params: any) => api.get('/reports/account-statement', { params }),
  personStatement: (params: any) => api.get('/reports/person-statement', { params }),
  loanReport: () => api.get('/reports/loan'),
  financialPosition: () => api.get('/reports/financial-position'),
};

export default api;

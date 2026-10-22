export type LoanStatus = 'PENDING' | 'REPAID';

export interface User {
  id: string;
  phoneNumber: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  friendName: string;
  amount: string; // Exact decimal string
  dueDate: string;
  status: LoanStatus;
  repaidAt: string | null;
  isOverdue: boolean;
  receiptUrl?: string | null;
  receiptOriginalName?: string | null;
  receiptMimeType?: string | null;
  receiptSize?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSummary {
  totalLent: string;
  totalRepaid: string;
  overdueAmount: string;
  currency: string;
  timezonePolicy: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Otp: { phoneNumber: string };
  Dashboard: undefined;
  AddLoan: undefined;
};

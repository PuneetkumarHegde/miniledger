import { getActiveBaseUrl } from '../config/api';
import { storage } from './storage';
import { Loan, LoanSummary, User } from '../types/index';

type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(callback: UnauthorizedHandler) {
  onUnauthorizedCallback = callback;
}

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getActiveBaseUrl();
  const token = await storage.getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach session token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, ensure Content-Type is json
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${baseUrl.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      `Cannot connect to MiniLedger backend at ${baseUrl}. Ensure backend server is running and accessible on network.`,
      0
    );
  }

  // Handle Unauthorized (401)
  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    const details = data && typeof data === 'object' ? data.details : undefined;
    throw new ApiError(errorMessage, response.status, details);
  }

  return data as T;
}

export const api = {
  auth: {
    async requestOtp(phoneNumber: string): Promise<{ success: boolean; message: string; expiresInSeconds: number }> {
      return request('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });
    },

    async verifyOtp(phoneNumber: string, otp: string): Promise<{ success: boolean; token: string; user: User }> {
      return request('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp }),
      });
    },

    async getMe(): Promise<{ success: boolean; user: User }> {
      return request('/api/auth/me', {
        method: 'GET',
      });
    },
  },

  loans: {
    async getAll(): Promise<{ success: boolean; data: Loan[]; count: number }> {
      return request('/api/loans', {
        method: 'GET',
      });
    },

    async getSummary(): Promise<{ success: boolean; data: LoanSummary }> {
      return request('/api/loans/summary', {
        method: 'GET',
      });
    },

    async create(payload: {
      friendName: string;
      amount: number | string;
      dueDate: string;
      receiptUrl?: string | null;
      receiptOriginalName?: string | null;
    }): Promise<{ success: boolean; data: Loan }> {
      return request('/api/loans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async repay(loanId: string): Promise<{ success: boolean; message: string; data: Loan }> {
      return request(`/api/loans/${loanId}/repay`, {
        method: 'PATCH',
      });
    },
  },

  upload: {
    async uploadReceipt(fileUri: string, filename: string, mimeType: string): Promise<{
      success: boolean;
      data: {
        fileUrl: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
      };
    }> {
      const baseUrl = await getActiveBaseUrl();
      const token = await storage.getToken();

      const formData = new FormData();
      formData.append('receipt', {
        uri: fileUri,
        name: filename,
        type: mimeType,
      } as any);

      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/upload`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new ApiError(json.error || 'Failed to upload receipt', response.status);
      }

      return json;
    },
  },
};

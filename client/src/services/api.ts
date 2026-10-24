const API_BASE = (import.meta as any).env?.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export class ApiError extends Error {
  errors?: Array<{ path: string; message: string }>;
  constructor(message: string, errors?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.errors = errors;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('sb_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'An unexpected error occurred', data.errors);
  }

  return data;
}

export const api = {
  // Auth
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request<any>('/auth/me'),
  forgotPassword: (payload: { email: string }) =>
    request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload: { email: string; resetToken: string; newPassword: string }) =>
    request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Companies
  submitCompany: (payload: any) => request<any>('/companies', { method: 'POST', body: JSON.stringify(payload) }),
  getMyCompanies: () => request<any>('/companies/my-companies'),
  getCompanyBySlug: (slug: string) => request<any>(`/companies/${slug}`),
  updateCompany: (id: string, payload: any) => request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  trackClick: (id: string) => request<any>(`/companies/${id}/click`, { method: 'POST' }),

  // Leaderboard
  getLeaderboards: () => request<any>('/leaderboards'),
  getLeaderboard: (slug: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/leaderboards/${slug}${query ? `?${query}` : ''}`);
  },
  getBidRequirements: (slug: string, rank: number = 1) => request<any>(`/leaderboards/${slug}/requirements?rank=${rank}`),

  // Bids & Payments
  createBidIntent: (payload: { listingId: string; leaderboardId: string; amount: number; provider?: 'RAZORPAY' | 'STRIPE' | 'UPI_DIRECT' }) =>
    request<any>('/bids/intent', { method: 'POST', body: JSON.stringify(payload) }),
  verifyPayment: (payload: { orderId: string; paymentId: string; signature: string; provider?: string; metadata?: any }) =>
    request<any>('/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
  verifyUpiPayment: (payload: { bidId: string; utr: string }) =>
    request<any>('/payments/verify-upi', { method: 'POST', body: JSON.stringify(payload) }),
  getBidHistory: (listingId: string) => request<any>(`/bids/history/${listingId}`),
  getMyPayments: () => request<any>('/payments/my-history'),

  // Analytics & Notifications
  getDashboardAnalytics: () => request<any>('/analytics/dashboard'),
  getNotifications: () => request<any>('/analytics/notifications'),
  markNotificationRead: (id: string) => request<any>(`/analytics/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/analytics/notifications/read-all', { method: 'PATCH' }),

  // Admin
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminListings: (status?: string, search?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return request<any>(`/admin/listings?${params.toString()}`);
  },
  updateListingStatus: (id: string, status: string, rejectionReason?: string) =>
    request<any>(`/admin/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, rejectionReason }) }),
  toggleListingVerification: (id: string, isVerified: boolean) =>
    request<any>(`/admin/listings/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ isVerified }) }),
  getAdminPayments: (status?: string, search?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return request<any>(`/admin/payments?${params.toString()}`);
  },
  refundPayment: (paymentId: string, reason?: string) =>
    request<any>('/admin/refund', { method: 'POST', body: JSON.stringify({ paymentId, reason }) }),
  getAdminSuspiciousBids: () => request<any>('/admin/suspicious-bids'),
  getAdminAuditLogs: () => request<any>('/admin/audit-logs'),
  updateLeaderboardRules: (payload: { id: string; minBidAmount: number; minBidIncrement: number }) =>
    request<any>('/admin/leaderboard-rules', { method: 'PATCH', body: JSON.stringify(payload) }),
  getAdminUsers: (search?: string, role?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    return request<any>(`/admin/users?${params.toString()}`);
  },
  adminResetUserPassword: (userId: string, newPassword: string) =>
    request<any>(`/admin/users/${userId}/password`, { method: 'PATCH', body: JSON.stringify({ newPassword }) }),
};

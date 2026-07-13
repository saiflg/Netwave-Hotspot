import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bdn_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('bdn_token');
      localStorage.removeItem('bdn_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Generic download helper (fetch + blob, bypasses window.open redirect issue) ───
export async function downloadBlob(path, filename) {
  const token = localStorage.getItem('bdn_token');
  const url   = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `Download failed (${res.status})`);
  }

  const blob      = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a         = document.createElement('a');
  a.href          = objectUrl;
  a.download      = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data)    => api.post('/auth/login', data),
  register:       (data)    => api.post('/auth/register', data),
  me:             ()        => api.get('/auth/me'),
  logout:         ()        => api.post('/auth/logout'),
  forgotPassword: (email)   => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data)    => api.post('/auth/reset-password', data),
  changePassword: (data)    => api.put('/auth/change-password', data),
  verifyEmail:    (token)   => api.get(`/auth/verify/${token}`),
  updateProfile:  (data)    => api.put('/auth/profile', data),
  updateEmail:    (data)    => api.put('/auth/email', data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get:    () => api.get('/dashboard'),
  health: () => api.get('/dashboard/health'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users',        { params }),
  get:    (id)     => api.get(`/users/${id}`),
  create: (data)   => api.post('/users',       data),
  update: (id, d)  => api.put(`/users/${id}`,  d),
  toggle: (id)     => api.patch(`/users/${id}/toggle`),
  delete: (id)     => api.delete(`/users/${id}`),
};

// ─── Routers ──────────────────────────────────────────────────────────────────
export const routersAPI = {
  getAll:         ()        => api.get('/routers'),
  get:            (id)      => api.get(`/routers/${id}`),
  create:         (data)    => api.post('/routers',             data),
  update:         (id, d)   => api.put(`/routers/${id}`,        d),
  delete:         (id)      => api.delete(`/routers/${id}`),
  test:           (id)      => api.post(`/routers/${id}/test`),
  testRaw:        (data)    => api.post('/routers/test-raw',    data),
  heartbeat:      (id)      => api.get(`/routers/${id}/heartbeat`),
  onlineUsers:    (id)      => api.get(`/routers/${id}/online-users`),
  stats:          (id)      => api.get(`/routers/${id}/stats`),
  profiles:       (id)      => api.get(`/routers/${id}/profiles`),
  reboot:         (id)      => api.post(`/routers/${id}/reboot`),
  backup:         (id)      => api.post(`/routers/${id}/backup`),
  disconnectUser:  (id, d) => api.post(`/routers/${id}/disconnect-user`,  d),
  configurePortal: (id)    => api.post(`/routers/${id}/configure-portal`),
  walledGarden:    (id)    => api.get( `/routers/${id}/walled-garden`),
  ispStatus:       (routerId) => publicFetch(`/routers/isp-status${routerId ? '?routerId='+routerId : ''}`).then(r => r.json()),
};

// ─── Plans ────────────────────────────────────────────────────────────────────
export const plansAPI = {
  getAll:    ()        => api.get('/plans'),
  getAllAdmin:()        => api.get('/plans/all'),
  create:    (data)    => api.post('/plans',       data),
  update:    (id, d)   => api.put(`/plans/${id}`,  d),
  delete:    (id)      => api.delete(`/plans/${id}`),
};

// ─── Vouchers ─────────────────────────────────────────────────────────────────
export const vouchersAPI = {
  getAll:       (params) => api.get('/vouchers',             { params }),
  get:          (id)     => api.get(`/vouchers/${id}`),
  create:       (data)   => api.post('/vouchers',            data),
  bulkGenerate: (data)   => api.post('/vouchers/bulk',       data),
  updateStatus: (id, s)  => api.patch(`/vouchers/${id}/status`, { status: s }),
  delete:       (id)     => api.delete(`/vouchers/${id}`),
  validate:     (code)   => api.post('/vouchers/validate',   { code }),

  // Export — returns the path for downloadBlob()
  exportPDFPath:   (params = {}) => `/vouchers/export/pdf?${new URLSearchParams(params)}`,
  exportExcelPath: (params = {}) => `/vouchers/export/excel?${new URLSearchParams(params)}`,
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  getAll:          (params) => api.get('/payments',                          { params }),
  get:             (id)     => api.get(`/payments/${id}`),
  initPaystack:    (data)   => api.post('/payments/paystack/init',           data),
  verifyPaystack:  (ref)    => api.get(`/payments/paystack/verify/${ref}`),
  initFlutterwave: (data)   => api.post('/payments/flutterwave/init',        data),
  verifyFlw:       (p)      => api.get('/payments/flutterwave/verify',       { params: p }),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsAPI = {
  getAll:    (params) => api.get('/sessions',            { params }),
  terminate: (id)     => api.delete(`/sessions/${id}`),
  active:    (params) => api.get('/hotspot/active-sessions', { params }),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsAPI = {
  get:    ()               => api.get('/settings/all'),
  update: (settings, group) => api.put('/settings', { settings, group }),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  summary:        (params) => api.get('/reports/summary', { params }),
  exportPDFPath:  (params) => `/reports/export/pdf?${new URLSearchParams(params)}`,
};

// ─── Hotspot ──────────────────────────────────────────────────────────────────
export const hotspotAPI = {
  login:         (data) => api.post('/hotspot/login',           data),
  logout:        (data) => api.post('/hotspot/logout',          data),
  config:        ()     => api.get('/hotspot/config'),
  sessionStatus: (id)   => api.get(`/hotspot/session/${id}`),
};

// ─── Legal ────────────────────────────────────────────────────────────────────
export const legalAPI = {
  getAll: ()         => api.get('/legal'),
  get:    (slug)     => api.get(`/legal/${slug}`),
  update: (slug, d)  => api.put(`/legal/${slug}`, d),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifAPI = {
  getAll:  ()   => api.get('/notifications'),
  readAll: ()   => api.put('/notifications/read-all'),
  read:    (id) => api.put(`/notifications/${id}/read`),
};

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const ticketsAPI = {
  getAll:       ()         => api.get('/tickets'),
  get:          (id)       => api.get(`/tickets/${id}`),
  create:       (data)     => api.post('/tickets',              data),
  reply:        (id, msg)  => api.post(`/tickets/${id}/reply`,  { message: msg }),
  updateStatus: (id, s)    => api.patch(`/tickets/${id}/status`,{ status: s }),
};

// ─── Ads & Announcements ──────────────────────────────────────────────────────
export const adsAPI = {
  getAll: ()        => api.get('/ads'),
  create: (data)    => api.post('/ads',       data),
  update: (id, d)   => api.put(`/ads/${id}`,  d),
  delete: (id)      => api.delete(`/ads/${id}`),
};

export const announcAPI = {
  getAll: ()        => api.get('/announcements'),
  create: (data)    => api.post('/announcements',       data),
  update: (id, d)   => api.put(`/announcements/${id}`,  d),
  delete: (id)      => api.delete(`/announcements/${id}`),
};

// ─── Uploads ──────────────────────────────────────────────────────────────────
export const uploadAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;

// ─── Public API base (works on Vercel — uses REACT_APP_API_URL env var) ───────
// All raw fetch() calls in public pages MUST use this instead of '/api/v1'
export const PUBLIC_API = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/+$/, '')          // strip trailing slash
  : (typeof window !== 'undefined'
      ? window.location.origin + '/api/v1'                     // local dev fallback
      : '/api/v1');

/**
 * publicFetch(path, options)
 * Drop-in replacement for fetch() in public pages.
 * Automatically prepends the correct backend URL.
 *
 * Usage:  publicFetch('/plans')  →  GET https://backend.onrender.com/api/v1/plans
 */
export async function publicFetch(path, options = {}) {
  const url = `${PUBLIC_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

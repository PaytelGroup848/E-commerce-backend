const api =  require('./api')

// ─── Token storage helpers ────────────────────────────────────────────────────
const storage = {
  set: (key, value) => localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)),
  get: (key) => {
    const v = localStorage.getItem(key) || sessionStorage.getItem(key);
    try { return v ? JSON.parse(v) : null; } catch { return v; }
  },
  remove: (key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); },
};

const saveAuthData = (data) => {
  if (data?.accessToken)  storage.set('accessToken', data.accessToken);
  if (data?.refreshToken) storage.set('refreshToken', data.refreshToken);
  if (data?.user)         storage.set('user', data.user);
};

 const authService = {
  // ── Register ─────────────────────────────────────────────────────────────
  // Returns: { message, data: { otp? } }  (no tokens yet — email not verified)
  register: async (userData) => {
    const response = await api.post('/auth/register', {
      name:     userData.name,
      email:    userData.email,
      phone:    userData.phone || undefined,
      password: userData.password,
    });
    // NOTE: do NOT save tokens here — user is not verified yet
    return response.data;
  },

  // ── Verify email OTP ──────────────────────────────────────────────────────
  verifyEmail: async (email, otp) => {
    const response = await api.post('/auth/verify-email', { email, otp: otp.toString() });
    return response.data;
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data?.data?.accessToken) {
      saveAuthData(response.data.data);
    }
    return response.data;
  },

  // ── Resend OTP ────────────────────────────────────────────────────────────
  resendOtp: async (email, type = 'email_verify') => {
    const response = await api.post('/auth/resend-otp', { email, type });
    return response.data;
  },

  // ── Forgot password ───────────────────────────────────────────────────────
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // ── Reset password ────────────────────────────────────────────────────────
  resetPassword: async (email, otp, newPassword, confirmPassword) => {
    const response = await api.post('/auth/reset-password', { email, otp, newPassword, confirmPassword });
    return response.data;
  },

  // ── Get current user ──────────────────────────────────────────────────────
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // ── Refresh token ─────────────────────────────────────────────────────────
  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    if (response.data?.data?.accessToken) {
      storage.set('accessToken', response.data.data.accessToken);
    }
    return response.data;
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Silently ignore — clear data regardless
    } finally {
      authService.clearAuthData();
      window.dispatchEvent(new Event('auth-changed'));
      window.location.href = '/login';
    }
  },

  // ── Auth checks ───────────────────────────────────────────────────────────
  isAuthenticated: () => {
    const token = authService.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        authService.clearAuthData();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  getUser:         () => storage.get('user'),
  getToken:        () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'),

  updateUser: (userData) => {
    const current = authService.getUser() || {};
    const updated = { ...current, ...userData };
    storage.set('user', updated);
    return updated;
  },

  clearAuthData: () => {
    ['accessToken', 'refreshToken', 'user'].forEach((k) => storage.remove(k));
    sessionStorage.clear();
  },

  // ── Role helpers ──────────────────────────────────────────────────────────
  hasRole:    (role) => authService.getUser()?.role === role,
  isAdmin:    () => ['super_admin', 'sub_admin'].includes(authService.getUser()?.role),
  isVendor:   () => authService.getUser()?.role === 'vendor',
  isCustomer: () => authService.getUser()?.role === 'customer',

  // ── Token expiry helpers ──────────────────────────────────────────────────
  getTokenExpiry: () => {
    const token = authService.getToken();
    if (!token) return null;
    try { return new Date(JSON.parse(atob(token.split('.')[1])).exp * 1000); } catch { return null; }
  },

  isTokenExpiringSoon: () => {
    const token = authService.getToken();
    if (!token) return false;
    try {
      const exp = JSON.parse(atob(token.split('.')[1])).exp * 1000;
      return (exp - Date.now()) < 5 * 60 * 1000;
    } catch { return true; }
  },

  autoRefreshToken: async () => {
    if (!authService.isAuthenticated()) return false;
    if (authService.isTokenExpiringSoon()) {
      try {
        const rt = authService.getRefreshToken();
        if (rt) { await authService.refreshToken(rt); return true; }
      } catch {
        authService.clearAuthData();
        window.location.href = '/login';
        return false;
      }
    }
    return false;
  },
};

module.exports = authService;
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  signup: async (userData) => {
    const res = await api.post('/auth/signup', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// Expense Services
export const expenseService = {
  getExpenses: async (params = {}) => {
    const res = await api.get('/expenses', { params });
    return res.data;
  },
  getExpense: async (id) => {
    const res = await api.get(`/expenses/${id}`);
    return res.data;
  },
  createExpense: async (expenseData) => {
    const res = await api.post('/expenses', expenseData);
    return res.data;
  },
  createBatchExpenses: async (expenses) => {
    const res = await api.post('/expenses/batch', { expenses });
    return res.data;
  },
  updateExpense: async (id, expenseData) => {
    const res = await api.put(`/expenses/${id}`, expenseData);
    return res.data;
  },
  deleteExpense: async (id) => {
    await api.delete(`/expenses/${id}`);
    return true;
  },
  exportCSV: async (params = {}) => {
    const res = await api.get('/expenses/export/csv', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};

// Budget Services
export const budgetService = {
  getOverview: async (month) => {
    const res = await api.get('/budgets/overview', { params: { month } });
    return res.data;
  },
  setBudget: async (budgetData) => {
    const res = await api.post('/budgets', budgetData);
    return res.data;
  },
  deleteBudget: async (id) => {
    await api.delete(`/budgets/${id}`);
    return true;
  },
};

// Analytics Services
export const analyticsService = {
  getDashboard: async () => {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },
};

// Categories Services
export const categoryService = {
  getCategories: async () => {
    const res = await api.get('/categories');
    return res.data;
  },
  createCategory: async (categoryData) => {
    const res = await api.post('/categories', categoryData);
    return res.data;
  },
};

// AI Chatbot Services
export const chatService = {
  sendMessage: async (message, sessionId = null) => {
    const res = await api.post('/chat/message', {
      message,
      session_id: sessionId,
    });
    return res.data;
  },
  confirmAction: async (sessionId, confirmed) => {
    const res = await api.post('/chat/confirm', {
      session_id: sessionId,
      confirmed,
    });
    return res.data;
  },
  getSessions: async () => {
    const res = await api.get('/chat/sessions');
    return res.data;
  },
  getSessionMessages: async (sessionId) => {
    const res = await api.get(`/chat/sessions/${sessionId}/messages`);
    return res.data;
  },
  deleteSession: async (sessionId) => {
    await api.delete(`/chat/sessions/${sessionId}`);
    return true;
  },
};

export default api;

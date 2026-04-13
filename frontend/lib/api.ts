import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API calls
export const api = {
  auth: {
    signup: (email: string, password: string) =>
      apiClient.post('/api/auth/signup', { email, password }),
    login: (email: string, password: string) =>
      apiClient.post('/api/auth/login', { email, password }),
    googleCallback: (code: string) =>
      apiClient.post('/api/auth/google/callback', { code }),
    keylessCallback: (jwt: string) =>
      apiClient.post('/api/auth/keyless/callback', { jwt }),
    verify: () => apiClient.get('/api/auth/verify'),
  },

  projects: {
    create: (data: {
      name: string;
      description: string;
      priceUsdcMicro: number;
      collaborators: { email: string; splitPercentage: number }[];
    }) => apiClient.post('/api/projects', data),
    getAll: () => apiClient.get('/api/projects'),
    getById: (id: number) => apiClient.get(`/api/projects/${id}`),
    update: (id: number, data: object) =>
      apiClient.put(`/api/projects/${id}`, data),
  },

  splits: {
    getCurrent: (projectId: number) =>
      apiClient.get(`/api/projects/${projectId}/splits/current`),
    propose: (projectId: number, data: object) =>
      apiClient.post(`/api/projects/${projectId}/splits/propose`, data),
    approve: (projectId: number, proposalId: number) =>
      apiClient.post(
        `/api/projects/${projectId}/splits/${proposalId}/approve`
      ),
  },

  payouts: {
    getHistory: (limit?: number, offset?: number) =>
      apiClient.get('/api/payouts/history', {
        params: { limit, offset },
      }),
    getBatch: (batchId: number) =>
      apiClient.get(`/api/payouts/batch/${batchId}`),
  },

  wallet: {
    getInfo: () => apiClient.get('/api/wallet/info'),
    requestFaucet: () => apiClient.post('/api/wallet/request-faucet', {}),
    requestMockUsdc: () => apiClient.post('/api/wallet/request-mock-usdc', {}),
    getTransactions: () => apiClient.get('/api/wallet/transactions'),
  },
};

import api from '@/lib/api';

const dailyLogService = {
  submit: async (data) => {
    const response = await api.post('/daily-logs', data);
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/daily-logs', { params });
    return response.data || [];
  },

  getById: async (id) => {
    const response = await api.get(`/daily-logs/${id}`);
    return response.data;
  },

  getSiteLogs: async (siteId, params = {}) => {
    const response = await api.get(`/daily-logs/sites/${siteId}`, { params });
    return response.data || [];
  },
};

export default dailyLogService;

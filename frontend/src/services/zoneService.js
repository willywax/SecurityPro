import api from '@/lib/api';
import { unwrapSingleResponse } from '@/utils/response';

const zoneService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status_filter) query.set('status_filter', params.status_filter);
    const response = await api.get(`/zones${query.toString() ? `?${query}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/zones/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/zones', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/zones/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/zones/${id}`);
    return response.data;
  },

  assignManager: async (zoneId, data) => {
    const response = await api.post(`/zones/${zoneId}/managers`, data);
    return response.data;
  },

  removeManager: async (zoneId, managerId) => {
    const response = await api.delete(`/zones/${zoneId}/managers/${managerId}`);
    return response.data;
  },
};

export default zoneService;

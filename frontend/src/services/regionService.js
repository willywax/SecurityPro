import api from '@/lib/api';

const regionService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.zone_id) query.set('zone_id', params.zone_id);
    if (params.status_filter) query.set('status_filter', params.status_filter);
    const response = await api.get(`/regions${query.toString() ? `?${query}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/regions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/regions', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/regions/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/regions/${id}`);
    return response.data;
  },

  transfer: async (id, data) => {
    const response = await api.post(`/regions/${id}/transfer`, data);
    return response.data;
  },
};

export default regionService;

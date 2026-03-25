import api from '@/lib/api';

const inventoryService = {
  list: (params = {}) => api.get('/inventory', { params }).then(r => r.data),
  get: (id) => api.get(`/inventory/${id}`).then(r => r.data),
  create: (data) => api.post('/inventory', data).then(r => r.data),
  update: (id, data) => api.patch(`/inventory/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/inventory/${id}`).then(r => r.data),
  receive: (id, data) => api.post(`/inventory/${id}/receive`, data).then(r => r.data),
  writeOff: (id, data) => api.post(`/inventory/${id}/write-off`, data).then(r => r.data),
  adjust: (id, data) => api.post(`/inventory/${id}/adjust`, data).then(r => r.data),
  getTransactions: (id) => api.get(`/inventory/${id}/transactions`).then(r => r.data),
  getIssuances: (id, params = {}) => api.get(`/inventory/${id}/issuances`, { params }).then(r => r.data),
};

export default inventoryService;

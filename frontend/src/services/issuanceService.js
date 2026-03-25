import api from '@/lib/api';

const issuanceService = {
  list: (params = {}) => api.get('/issuances', { params }).then(r => r.data),
  issue: (data) => api.post('/issuances', data).then(r => r.data),
  return: (id, data) => api.post(`/issuances/${id}/return`, data).then(r => r.data),
};

export default issuanceService;

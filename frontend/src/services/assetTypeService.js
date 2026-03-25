import api from '@/lib/api';

const assetTypeService = {
  list: () => api.get('/asset-types').then(r => r.data),
  create: (data) => api.post('/asset-types', data).then(r => r.data),
  update: (id, data) => api.patch(`/asset-types/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/asset-types/${id}`).then(r => r.data),
};

export default assetTypeService;

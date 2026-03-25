import api from '@/lib/api';

const storeService = {
  get: () => api.get('/store').then(r => r.data),
  update: (data) => api.patch('/store', data).then(r => r.data),
};

export default storeService;

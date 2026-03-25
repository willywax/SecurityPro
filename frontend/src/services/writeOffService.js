import api from '@/lib/api';

const writeOffService = {
  list: (params = {}) => api.get('/write-offs', { params }).then(r => r.data),
};

export default writeOffService;

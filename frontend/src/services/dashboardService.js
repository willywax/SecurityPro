import api from '@/lib/api';

const dashboardService = {
  getSummary: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },
  getZoneManagerSummary: async () => {
    const response = await api.get('/dashboard/zone-manager');
    return response.data;
  },
};

export default dashboardService;

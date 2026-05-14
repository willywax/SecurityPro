import api from '@/lib/api';

const reportService = {
  generateEmployeeReport: async (body) => {
    const response = await api.post('/reports/employees', body);
    return response.data;
  },

  getContractExpiry: async () => {
    const response = await api.get('/reports/contract-expiry');
    return response.data;
  },
};

export default reportService;

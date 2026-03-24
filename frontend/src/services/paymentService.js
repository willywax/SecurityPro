import api from '@/lib/api';
import { unwrapSingleResponse } from '@/utils/response';

const paymentService = {
  getAll: async (params) => {
    const response = await api.get('/invoices/payments', { params });
    const data = unwrapSingleResponse(response) || [];
    return {
      data,
      total: data.length,
      page: 1,
      pageSize: data.length,
      totalPages: 1,
    };
  },
  getById: async (id) => {
    const response = await api.get('/invoices/payments', { params: {} });
    const payments = unwrapSingleResponse(response) || [];
    return payments.find((payment) => payment.id === id) || null;
  },
  create: async (data) => {
    const response = await api.post('/invoices/payments', data);
    return unwrapSingleResponse(response);
  },
  update: async () => {
    throw new Error('Payment update is not supported by the backend');
  },
  delete: async () => {
    throw new Error('Payment delete is not supported by the backend');
  },
};

export default paymentService;

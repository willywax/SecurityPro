import api from '@/lib/api';
import { createCrudService } from '@/services/serviceFactory';
import { unwrapSingleResponse } from '@/utils/response';

const baseService = createCrudService('/invoices', 'invoices');

const invoiceService = {
  ...baseService,
  updateStatus: async (id, status) => {
    const response = await api.put(`/invoices/${id}/status`, { status });
    return unwrapSingleResponse(response);
  },
};

export default invoiceService;

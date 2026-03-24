import api from '@/lib/api';
import { createCrudService } from '@/services/serviceFactory';
import { unwrapSingleResponse } from '@/utils/response';

const baseService = createCrudService('/payroll', 'payrolls');

const payrollService = {
  ...baseService,
  createBulk: async (data) => {
    const response = await api.post('/payroll/bulk', data);
    return unwrapSingleResponse(response);
  },
};

export default payrollService;

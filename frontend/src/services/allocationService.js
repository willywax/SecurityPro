import api from '@/lib/api';

const allocationService = {
  getAvailableGuards: async (params = {}) => {
    const response = await api.get('/allocations/available-guards', { params });
    return response.data || [];
  },

  allocateGuard: async (siteId, data) => {
    const response = await api.post(`/allocations/sites/${siteId}/allocate`, data);
    return response.data;
  },

  transferGuard: async (employeeId, data) => {
    const response = await api.post(`/allocations/employees/${employeeId}/transfer`, data);
    return response.data;
  },

  deallocateGuard: async (siteId, employeeId) => {
    const response = await api.delete(`/allocations/sites/${siteId}/allocations/${employeeId}`);
    return response.data;
  },

  getSiteGuards: async (siteId) => {
    const response = await api.get(`/allocations/sites/${siteId}/guards`);
    return response.data || [];
  },

  getEmployeeAllocationHistory: async (employeeId) => {
    const response = await api.get(`/allocations/employees/${employeeId}/history`);
    return response.data || [];
  },

  getEmployeeTransfers: async (employeeId) => {
    const response = await api.get(`/allocations/employees/${employeeId}/transfers`);
    return response.data || [];
  },

  getZoneOverview: async (zoneId) => {
    const response = await api.get(`/allocations/zones/${zoneId}/overview`);
    return response.data || [];
  },
};

export default allocationService;

import api from '@/lib/api';
import { createCrudService } from '@/services/serviceFactory';

const base = createCrudService('/users', 'users');

const userService = {
  ...base,

  getUserZones: async (userId) => {
    const response = await api.get(`/users/${userId}/zones`);
    return response.data || [];
  },

  updateUserZones: async (userId, zoneIds) => {
    const response = await api.post(`/users/${userId}/zones`, { zone_ids: zoneIds });
    return response.data || [];
  },
};

export default userService;

import api from '@/lib/api';
import { unwrapListResponse, unwrapSingleResponse } from '@/utils/response';

export const createCrudService = (resource, listKey) => ({
  getAll: async (params) => {
    const response = await api.get(resource, { params });
    return unwrapListResponse(response, listKey);
  },
  getById: async (id) => {
    const response = await api.get(`${resource}/${id}`);
    return unwrapSingleResponse(response);
  },
  create: async (data, config) => {
    const response = await api.post(resource, data, config);
    return unwrapSingleResponse(response);
  },
  update: async (id, data, config) => {
    const response = await api.put(`${resource}/${id}`, data, config);
    return unwrapSingleResponse(response);
  },
  delete: async (id) => {
    const response = await api.delete(`${resource}/${id}`);
    return unwrapSingleResponse(response);
  },
});

import api from '@/lib/api';
import { createCrudService } from '@/services/serviceFactory';
import { unwrapSingleResponse } from '@/utils/response';

const baseService = createCrudService('/assets', 'assets');

const assetService = {
  ...baseService,
  getIssuances: async (assetId) => {
    const response = await api.get(`/assets/${assetId}/issuances`);
    return unwrapSingleResponse(response) || [];
  },
  issue: async (assetId, data) => {
    const response = await api.post(`/assets/${assetId}/issue`, data);
    return unwrapSingleResponse(response);
  },
  markReturn: async (issuanceId, data) => {
    const response = await api.put(`/assets/issuances/${issuanceId}/return`, data);
    return unwrapSingleResponse(response);
  },
};

export default assetService;

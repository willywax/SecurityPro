import type { Asset } from '../domain';
import { request } from './http';

export type AssetCreateInput = { asset_tag: string; type: string; name?: string; status?: string };

export const assetsApi = {
  list: () => request<Asset[]>('/assets'),
  listAvailable: () => request<Asset[]>('/assets?status=available'),
  create: (payload: AssetCreateInput) => request<Asset>('/assets', { method: 'POST', body: JSON.stringify(payload) }),
};

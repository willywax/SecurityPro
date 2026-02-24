import type { Site } from '../domain';
import { request } from './http';

export type SiteCreateInput = { client_id: string; name: string; region?: string; status?: string };

export const sitesApi = {
  list: () => request<Site[]>('/sites'),
  create: (payload: SiteCreateInput) => request<Site>('/sites', { method: 'POST', body: JSON.stringify(payload) }),
};

import type { Client } from '../domain';
import { request } from './http';

export type ClientCreateInput = {
  name: string;
  contact_name?: string;
  billing_email?: string;
  status?: string;
};

export const clientsApi = {
  list: () => request<Client[]>('/clients'),
  create: (payload: ClientCreateInput) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(payload) }),
};

import type { Invoice } from '../domain';
import { request } from './http';

export type InvoiceCreateInput = {
  client_id: string;
  issue_date: string;
  due_date: string;
  currency?: string;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
};

export const invoicesApi = {
  list: () => request<Invoice[]>('/invoices'),
  create: (payload: InvoiceCreateInput) => request<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
};

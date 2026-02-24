import type { Payment } from '../domain';
import { request } from './http';

export type PaymentCreateInput = {
  client_id: string;
  payment_date: string;
  amount: number;
  method: string;
  reference?: string;
};

export const paymentsApi = {
  list: () => request<Payment[]>('/payments'),
  create: (payload: PaymentCreateInput) => request<Payment>('/payments', { method: 'POST', body: JSON.stringify(payload) }),
};

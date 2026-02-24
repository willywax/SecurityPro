import type { PayrollAdjustment, PayrollMonth } from '../domain';
import { request } from './http';

export type PayrollAdjustmentCreateInput = { type: string; label: string; amount: number };

export const payrollApi = {
  listMonths: () => request<PayrollMonth[]>('/payroll-months'),
  createAdjustment: (itemId: string, payload: PayrollAdjustmentCreateInput) =>
    request<PayrollAdjustment>(`/payroll-items/${itemId}/adjustments`, { method: 'POST', body: JSON.stringify(payload) }),
};

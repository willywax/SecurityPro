import type { Guard } from '../domain';
import { request } from './http';

export type GuardCreateInput = {
  guard_no: string;
  full_name: string;
  hire_date: string;
  base_salary_monthly: number;
  status?: string;
};

export const guardsApi = {
  list: () => request<Guard[]>('/guards'),
  create: (payload: GuardCreateInput) => request<Guard>('/guards', { method: 'POST', body: JSON.stringify(payload) }),
};

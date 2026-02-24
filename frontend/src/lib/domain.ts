export type UUID = string;

export type Client = {
  id: UUID;
  name: string;
  contact_name?: string | null;
  billing_email?: string | null;
  phone?: string | null;
  status: string;
};

export type Site = {
  id: UUID;
  client_id: UUID;
  name: string;
  region?: string | null;
  address?: string | null;
  status: string;
};

export type Guard = {
  id: UUID;
  guard_no: string;
  full_name: string;
  hire_date: string;
  base_salary_monthly: string | number;
  status: string;
};

export type Asset = {
  id: UUID;
  asset_tag: string;
  name?: string | null;
  type: string;
  status: string;
  assigned_site_id?: UUID | null;
};

export type Invoice = {
  id: UUID;
  invoice_no: string;
  client_id: UUID;
  issue_date: string;
  due_date: string;
  total: string | number;
  status: string;
};

export type Payment = {
  id: UUID;
  client_id: UUID;
  payment_date: string;
  amount: string | number;
  method: string;
  reference_no?: string | null;
  status?: string;
};

export type PayrollMonth = {
  id: UUID;
  month: string;
  total_guards?: number;
  gross_amount?: string | number;
  net_amount?: string | number;
  status: string;
};

export type PayrollAdjustment = {
  id: UUID;
  payroll_item_id: UUID;
  type: string;
  label: string;
  amount: string | number;
};

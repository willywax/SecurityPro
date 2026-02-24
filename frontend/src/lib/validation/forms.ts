import { z } from 'zod';

const requiredId = z.string().uuid('Must be a valid UUID.');

export const clientFormSchema = z.object({
  name: z.string().min(2, 'Client name is required.'),
  contact_name: z.string().min(2, 'Contact name is required.'),
  billing_email: z.string().email('Billing email must be valid.'),
  status: z.string().min(1, 'Status is required.'),
});

export const siteFormSchema = z.object({
  client_id: requiredId,
  name: z.string().min(2, 'Site name is required.'),
  region: z.string().min(2, 'Region is required.'),
  status: z.string().min(1, 'Status is required.'),
});

export const guardFormSchema = z.object({
  guard_no: z.string().min(1, 'Guard number is required.'),
  full_name: z.string().min(2, 'Full name is required.'),
  hire_date: z.string().date('Hire date must be a valid date.'),
  base_salary_monthly: z.coerce.number().positive('Base salary must be positive.'),
  status: z.string().min(1, 'Status is required.'),
});

export const assetFormSchema = z.object({
  asset_tag: z.string().min(1, 'Asset tag is required.'),
  type: z.string().min(2, 'Asset type is required.'),
  name: z.string().optional(),
  status: z.string().min(1, 'Status is required.'),
});

export const invoiceFormSchema = z.object({
  client_id: requiredId,
  issue_date: z.string().date('Issue date must be valid.'),
  due_date: z.string().date('Due date must be valid.'),
  item_description: z.string().min(3, 'Description is required.'),
  item_quantity: z.coerce.number().positive('Quantity must be positive.'),
  item_unit_price: z.coerce.number().positive('Unit price must be positive.'),
});

export const paymentFormSchema = z.object({
  client_id: requiredId,
  payment_date: z.string().date('Payment date must be valid.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  method: z.string().min(2, 'Payment method is required.'),
  reference: z.string().optional(),
});

export const payrollAdjustmentFormSchema = z.object({
  payroll_item_id: requiredId,
  type: z.string().min(2, 'Adjustment type is required.'),
  label: z.string().min(2, 'Adjustment label is required.'),
  amount: z.coerce.number().refine((v) => v !== 0, 'Amount cannot be zero.'),
});

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

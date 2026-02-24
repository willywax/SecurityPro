import ModuleListPage from './ModuleListPage';
import { payrollApi } from '../lib/api';
import { payrollAdjustmentFormSchema } from '../lib/validation/forms';

export default function Payroll() {
  return (
    <ModuleListPage
      title='Payroll Months'
      loadItems={payrollApi.listMonths}
      createConfig={{
        schema: payrollAdjustmentFormSchema,
        initialValues: { payroll_item_id: '', type: 'allowance', label: '', amount: '0' },
        fields: [
          { key: 'payroll_item_id', label: 'Payroll Item ID' },
          { key: 'type', label: 'Type', options: ['allowance', 'deduction', 'overtime'] },
          { key: 'label', label: 'Label' },
          { key: 'amount', label: 'Amount', type: 'number' },
        ],
        submit: (values: any) =>
          payrollApi.createAdjustment(values.payroll_item_id, {
            type: values.type,
            label: values.label,
            amount: values.amount,
          }),
      }}
      filters={['all', 'draft', 'locked', 'paid']}
      hideCardFallback
      fields={[
        { key: 'month', label: 'Month', primary: true, sticky: true },
        { key: 'total_guards', label: 'Guards' },
        { key: 'gross_amount', label: 'Gross' },
        { key: 'net_amount', label: 'Net' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

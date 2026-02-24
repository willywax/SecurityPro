import ModuleListPage from './ModuleListPage';
import { paymentsApi } from '../lib/api';
import { paymentFormSchema } from '../lib/validation/forms';

export default function Payments() {
  return (
    <ModuleListPage
      title='Payments'
      loadItems={paymentsApi.list}
      createConfig={{
        schema: paymentFormSchema,
        initialValues: { client_id: '', payment_date: '', amount: '0', method: '', reference: '' },
        fields: [
          { key: 'client_id', label: 'Client ID' },
          { key: 'payment_date', label: 'Date', type: 'date' },
          { key: 'amount', label: 'Amount', type: 'number' },
          { key: 'method', label: 'Method' },
          { key: 'reference', label: 'Reference' },
        ],
        submit: paymentsApi.create,
      }}
      filters={['all', 'recorded', 'reconciled', 'failed']}
      hideCardFallback
      fields={[
        { key: 'payment_date', label: 'Date', primary: true, sticky: true },
        { key: 'client_id', label: 'Client ID' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
        { key: 'reference_no', label: 'Reference', hideOnMobile: true },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

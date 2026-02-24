import ModuleListPage from './ModuleListPage';

export default function Payments() {
  return (
    <ModuleListPage
      title='Payments'
      path='payments'
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

import ModuleListPage from './ModuleListPage';

export default function Invoices() {
  return (
    <ModuleListPage
      title='Invoices'
      path='invoices'
      filters={['all', 'draft', 'sent', 'part_paid', 'paid', 'void']}
      hideCardFallback
      fields={[
        { key: 'invoice_no', label: 'Invoice #', primary: true, sticky: true },
        { key: 'client_id', label: 'Client ID' },
        { key: 'issue_date', label: 'Issue Date' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'total', label: 'Total' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

import ModuleListPage from './ModuleListPage';

export default function Payroll() {
  return (
    <ModuleListPage
      title='Payroll Months'
      path='payroll-months'
      filters={['all', 'draft', 'approved', 'paid']}
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

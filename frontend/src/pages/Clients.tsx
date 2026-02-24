import ModuleListPage from './ModuleListPage';

export default function Clients() {
  return (
    <ModuleListPage
      title='Clients'
      path='clients'
      filters={['all', 'active', 'prospect', 'inactive']}
      fields={[
        { key: 'name', label: 'Client', primary: true, sticky: true },
        { key: 'contact_name', label: 'Contact Person' },
        { key: 'billing_email', label: 'Billing Email' },
        { key: 'phone', label: 'Phone', hideOnMobile: true },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

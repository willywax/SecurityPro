import ModuleListPage from './ModuleListPage';
import { clientsApi } from '../lib/api';
import { clientFormSchema } from '../lib/validation/forms';

export default function Clients() {
  return (
    <ModuleListPage
      title='Clients'
      loadItems={clientsApi.list}
      createConfig={{
        schema: clientFormSchema,
        initialValues: { name: '', contact_name: '', billing_email: '', status: 'active' },
        fields: [
          { key: 'name', label: 'Client Name' },
          { key: 'contact_name', label: 'Contact Person' },
          { key: 'billing_email', label: 'Billing Email' },
          { key: 'status', label: 'Status', options: ['active', 'prospect', 'inactive'] },
        ],
        submit: clientsApi.create,
      }}
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

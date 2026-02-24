import ModuleListPage from './ModuleListPage';
import { sitesApi } from '../lib/api';
import { siteFormSchema } from '../lib/validation/forms';

export default function Sites() {
  return (
    <ModuleListPage
      title='Sites'
      loadItems={sitesApi.list}
      createConfig={{
        schema: siteFormSchema,
        initialValues: { client_id: '', name: '', region: '', status: 'active' },
        fields: [
          { key: 'client_id', label: 'Client ID' },
          { key: 'name', label: 'Site Name' },
          { key: 'region', label: 'Region' },
          { key: 'status', label: 'Status', options: ['active', 'paused', 'inactive'] },
        ],
        submit: sitesApi.create,
      }}
      filters={['all', 'active', 'paused', 'inactive']}
      fields={[
        { key: 'name', label: 'Site', primary: true, sticky: true },
        { key: 'client_id', label: 'Client ID' },
        { key: 'region', label: 'Region' },
        { key: 'address', label: 'Address', hideOnMobile: true },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

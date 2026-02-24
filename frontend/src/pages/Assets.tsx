import ModuleListPage from './ModuleListPage';
import { assetsApi } from '../lib/api';
import { assetFormSchema } from '../lib/validation/forms';

export default function Assets() {
  return (
    <ModuleListPage
      title='Assets'
      loadItems={assetsApi.list}
      createConfig={{
        schema: assetFormSchema,
        initialValues: { asset_tag: '', name: '', type: '', status: 'active' },
        fields: [
          { key: 'asset_tag', label: 'Asset Tag' },
          { key: 'name', label: 'Name' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status', options: ['active', 'maintenance', 'retired'] },
        ],
        submit: assetsApi.create,
      }}
      filters={['all', 'active', 'maintenance', 'retired']}
      fields={[
        { key: 'asset_tag', label: 'Asset Tag', primary: true, sticky: true },
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'assigned_site_id', label: 'Assigned Site', hideOnMobile: true },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

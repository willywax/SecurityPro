import ModuleListPage from './ModuleListPage';

export default function Assets() {
  return (
    <ModuleListPage
      title='Assets'
      path='assets'
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

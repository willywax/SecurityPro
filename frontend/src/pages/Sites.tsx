import ModuleListPage from './ModuleListPage';

export default function Sites() {
  return (
    <ModuleListPage
      title='Sites'
      path='sites'
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

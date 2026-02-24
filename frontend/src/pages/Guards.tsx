import ModuleListPage from './ModuleListPage';

export default function Guards() {
  return (
    <ModuleListPage
      title='Guards'
      path='guards'
      filters={['all', 'active', 'inactive', 'on_leave']}
      fields={[
        { key: 'guard_no', label: 'Guard No', primary: true, sticky: true },
        { key: 'full_name', label: 'Full Name' },
        { key: 'hire_date', label: 'Hire Date' },
        { key: 'base_salary_monthly', label: 'Base Salary' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

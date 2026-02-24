import ModuleListPage from './ModuleListPage';
import { guardsApi } from '../lib/api';
import { guardFormSchema } from '../lib/validation/forms';

export default function Guards() {
  return (
    <ModuleListPage
      title='Guards'
      loadItems={guardsApi.list}
      createConfig={{
        schema: guardFormSchema,
        initialValues: { guard_no: '', full_name: '', hire_date: '', base_salary_monthly: '0', status: 'active' },
        fields: [
          { key: 'guard_no', label: 'Guard Number' },
          { key: 'full_name', label: 'Full Name' },
          { key: 'hire_date', label: 'Hire Date', type: 'date' },
          { key: 'base_salary_monthly', label: 'Base Salary', type: 'number' },
          { key: 'status', label: 'Status', options: ['active', 'inactive', 'on_leave'] },
        ],
        submit: guardsApi.create,
      }}
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

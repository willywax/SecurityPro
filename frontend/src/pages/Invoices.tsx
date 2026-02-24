import ModuleListPage from './ModuleListPage';
import { invoicesApi } from '../lib/api';
import { invoiceFormSchema } from '../lib/validation/forms';

export default function Invoices() {
  return (
    <ModuleListPage
      title='Invoices'
      loadItems={invoicesApi.list}
      createConfig={{
        schema: invoiceFormSchema,
        initialValues: { client_id: '', issue_date: '', due_date: '', item_description: '', item_quantity: '1', item_unit_price: '0' },
        fields: [
          { key: 'client_id', label: 'Client ID' },
          { key: 'issue_date', label: 'Issue Date', type: 'date' },
          { key: 'due_date', label: 'Due Date', type: 'date' },
          { key: 'item_description', label: 'Item Description' },
          { key: 'item_quantity', label: 'Qty', type: 'number' },
          { key: 'item_unit_price', label: 'Unit Price', type: 'number' },
        ],
        mapPayload: (values) => ({
          client_id: values.client_id,
          issue_date: values.issue_date,
          due_date: values.due_date,
          items: [{ description: values.item_description, quantity: values.item_quantity, unit_price: values.item_unit_price }],
        }),
        submit: invoicesApi.create,
      }}
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

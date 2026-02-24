import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { resolveStatusVariant } from '../lib/status';

export default function Invoices() {
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ currency: 'TZS', items: [{ description: 'Security services', quantity: 1, unit_price: 0 }] });

  useEffect(() => {
    api<any[]>('/clients').then(setClients);
    api<any[]>('/invoices').then(setInvoices);
  }, []);

  const create = async (e: any) => {
    e.preventDefault();
    const payload = {
      ...form,
      client_id: form.client_id,
      issue_date: form.issue_date,
      due_date: form.due_date,
      items: form.items,
      tax_total: Number(form.tax_total || 0),
    };
    await api('/invoices', { method: 'POST', body: JSON.stringify(payload) });
    setInvoices(await api('/invoices'));
  };

  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-semibold'>Invoices</h1>
      <Card>
        <form onSubmit={create} className='grid gap-2 md:grid-cols-2'>
          <Select onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value=''>Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input type='date' onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
          <Input type='date' onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Input placeholder='description' onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], description: e.target.value }] })} />
          <Input placeholder='unit price' onChange={(e) => setForm({ ...form, items: [{ ...form.items[0], unit_price: Number(e.target.value) }] })} />
          <Button className='md:col-span-2'>Create Invoice</Button>
        </form>
      </Card>
      <Card className='overflow-x-auto p-0'>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Invoice</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoice_no}</TableCell>
                <TableCell>
                  <Badge variant={resolveStatusVariant(invoice.status)}>{invoice.status}</Badge>
                </TableCell>
                <TableCell>{invoice.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Dialog from '../components/ui/Dialog';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { resolveStatusVariant } from '../lib/status';

export default function Payments() {
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [form, setForm] = useState<any>({ method: 'bank' });

  useEffect(() => {
    api<any[]>('/clients').then(setClients);
    api<any[]>('/invoices?status=sent').then(setInvoices);
    api<any[]>('/payments').then(setItems);
  }, []);

  const submit = async (e: any) => {
    e.preventDefault();
    const alloc = form.invoice_id ? [{ invoice_id: form.invoice_id, amount: Number(form.alloc_amount || form.amount) }] : [];
    await api('/payments', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount), allocations: alloc }) });
    setItems(await api<any[]>('/payments'));
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Payments</h1>
        <Button variant='ghost' onClick={() => setShowHelp(true)}>
          Allocation Help
        </Button>
      </div>

      <Card>
        <form onSubmit={submit} className='grid gap-2 md:grid-cols-3'>
          <Select onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value=''>Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input type='date' onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          <Input placeholder='amount' onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}>
            <option value=''>Allocate invoice</option>
            {invoices.map((invoice: any) => (
              <option value={invoice.id} key={invoice.id}>
                {invoice.invoice_no}
              </option>
            ))}
          </Select>
          <Button className='md:col-span-2'>Record Payment</Button>
        </form>
      </Card>

      <Card className='overflow-x-auto p-0'>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Amount</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((payment: any) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.payment_date}</TableCell>
                <TableCell>{payment.amount}</TableCell>
                <TableCell>
                  <Badge variant={resolveStatusVariant(payment.status)}>{payment.status ?? 'recorded'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showHelp} title='Payment Allocation' onClose={() => setShowHelp(false)}>
        <p className='text-sm text-text-secondary'>
          Link incoming payments to sent invoices. Status badges use the same semantic variants as invoice and asset records.
        </p>
      </Dialog>
    </div>
  );
}

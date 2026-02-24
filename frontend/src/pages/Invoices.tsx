import { useMemo, useState } from 'react';
import Badge, { type BadgeVariant } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';

type InvoiceStatus = 'draft' | 'saved' | 'sent' | 'void';

type InvoiceItem = {
  id: number;
  description: string;
  qty: number;
  rate: number;
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const statusVariant: Record<InvoiceStatus, BadgeVariant> = {
  draft: 'neutral',
  saved: 'info',
  sent: 'warning',
  void: 'danger',
};

export default function Invoices() {
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: 1, description: 'Guarding services - Week 1', qty: 40, rate: 35 },
    { id: 2, description: 'Patrol mobile unit', qty: 10, rate: 42 },
  ]);

  const subtotal = useMemo(
    () => invoiceItems.reduce((total, item) => total + item.qty * item.rate, 0),
    [invoiceItems],
  );
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  const balance = Math.max(total - amountPaid, 0);

  const addItem = () => {
    const nextId = Math.max(0, ...invoiceItems.map((item) => item.id)) + 1;
    setInvoiceItems((current) => [...current, { id: nextId, description: '', qty: 1, rate: 0 }]);
  };

  const removeItem = (id: number) => {
    setInvoiceItems((current) => current.filter((item) => item.id !== id));
  };

  const updateItem = <K extends keyof InvoiceItem>(id: number, key: K, value: InvoiceItem[K]) => {
    setInvoiceItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
        <Card>
          <div className='mb-4 flex items-center justify-between'>
            <h1 className='text-xl font-semibold'>Invoice Builder</h1>
            <Badge variant={statusVariant[status]}>{status.toUpperCase()}</Badge>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell className='w-24'>Qty</TableHeaderCell>
                <TableHeaderCell className='w-28'>Rate</TableHeaderCell>
                <TableHeaderCell className='w-28'>Line Total</TableHeaderCell>
                <TableHeaderCell className='w-20'>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoiceItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                      placeholder='Describe service line item'
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type='number'
                      min={0}
                      value={item.qty}
                      onChange={(event) => updateItem(item.id, 'qty', Number(event.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type='number'
                      min={0}
                      value={item.rate}
                      onChange={(event) => updateItem(item.id, 'rate', Number(event.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className='font-medium'>{currency.format(item.qty * item.rate)}</TableCell>
                  <TableCell>
                    <Button variant='ghost' onClick={() => removeItem(item.id)} disabled={invoiceItems.length === 1}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className='mt-4 flex flex-wrap gap-2'>
            <Button variant='secondary' onClick={addItem}>
              + Add Item Row
            </Button>
            <Button variant='secondary' onClick={() => setStatus('draft')}>
              Save Draft
            </Button>
            <Button variant='primary' onClick={() => setStatus('saved')}>
              Save
            </Button>
            <Button variant='primary' onClick={() => setStatus('sent')}>
              Send Invoice
            </Button>
            <Button variant='danger' onClick={() => setStatus('void')}>
              Void
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className='mb-4 text-lg font-semibold'>Invoice Detail</h2>
          <div className='space-y-3 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-text-secondary'>Status</span>
              <Badge variant={statusVariant[status]}>{status.toUpperCase()}</Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-text-secondary'>Subtotal</span>
              <span>{currency.format(subtotal)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-text-secondary'>Tax (10%)</span>
              <span>{currency.format(tax)}</span>
            </div>
            <div className='flex items-center justify-between font-semibold'>
              <span>Total</span>
              <span>{currency.format(total)}</span>
            </div>
            <div className='pt-2'>
              <label className='mb-1 block text-xs text-text-secondary'>Amount Paid</label>
              <Input
                type='number'
                min={0}
                value={amountPaid}
                onChange={(event) => setAmountPaid(Number(event.target.value) || 0)}
              />
            </div>
            <div className='mt-2 rounded-token-md border border-border-subtle bg-surface-muted p-3'>
              <p className='text-xs text-text-secondary'>Balance Due</p>
              <p className='text-xl font-semibold text-semantic-danger-fg'>{currency.format(balance)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';

type AllocationRow = {
  id: string;
  invoiceNo: string;
  dueDate: string;
  outstanding: number;
};

const openInvoices: AllocationRow[] = [
  { id: '1', invoiceNo: 'INV-1142', dueDate: '2026-02-10', outstanding: 1450 },
  { id: '2', invoiceNo: 'INV-1147', dueDate: '2026-02-18', outstanding: 960 },
  { id: '3', invoiceNo: 'INV-1153', dueDate: '2026-02-25', outstanding: 725 },
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function Payments() {
  const [paymentAmount, setPaymentAmount] = useState<number>(2000);
  const [allocations, setAllocations] = useState<Record<string, number>>({
    '1': 1000,
    '2': 500,
    '3': 0,
  });

  const allocatedTotal = useMemo(
    () => Object.values(allocations).reduce((sum, value) => sum + value, 0),
    [allocations],
  );

  const remaining = paymentAmount - allocatedTotal;

  const setAllocation = (id: string, value: number, max: number) => {
    const normalized = Math.max(0, Math.min(value || 0, max));
    setAllocations((current) => ({ ...current, [id]: normalized }));
  };

  return (
    <div className='space-y-4'>
      <Card>
        <div className='grid gap-4 md:grid-cols-3'>
          <div>
            <label className='mb-1 block text-xs text-text-secondary'>Payment Amount</label>
            <Input
              type='number'
              min={0}
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(Number(event.target.value) || 0)}
            />
          </div>
          <div className='rounded-token-md border border-border-subtle bg-surface-muted p-3'>
            <p className='text-xs text-text-secondary'>Allocated</p>
            <p className='text-lg font-semibold'>{currency.format(allocatedTotal)}</p>
          </div>
          <div className='rounded-token-md border border-border-subtle bg-surface-muted p-3'>
            <p className='text-xs text-text-secondary'>Remaining Payment</p>
            <p className={`text-lg font-semibold ${remaining < 0 ? 'text-semantic-danger-fg' : 'text-semantic-success-fg'}`}>
              {currency.format(remaining)}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h1 className='mb-4 text-xl font-semibold'>Payment Allocation</h1>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Invoice</TableHeaderCell>
              <TableHeaderCell>Due Date</TableHeaderCell>
              <TableHeaderCell>Outstanding</TableHeaderCell>
              <TableHeaderCell>Allocatable</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {openInvoices.map((invoice) => {
              const allocated = allocations[invoice.id] ?? 0;
              const invoiceRemaining = invoice.outstanding - allocated;

              return (
                <TableRow key={invoice.id}>
                  <TableCell className='font-medium'>{invoice.invoiceNo}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>{currency.format(invoice.outstanding)}</TableCell>
                  <TableCell>
                    <Input
                      type='number'
                      min={0}
                      max={invoice.outstanding}
                      value={allocated}
                      onChange={(event) => setAllocation(invoice.id, Number(event.target.value), invoice.outstanding)}
                    />
                  </TableCell>
                  <TableCell>
                    {invoiceRemaining === 0 ? <Badge variant='success'>Fully allocated</Badge> : <Badge variant='warning'>{currency.format(invoiceRemaining)} open</Badge>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

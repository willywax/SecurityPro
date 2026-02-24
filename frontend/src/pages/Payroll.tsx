import { useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Drawer from '../components/ui/Drawer';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';

type PayrollItem = {
  id: number;
  guard: string;
  basic: number;
  allowance: number;
  deduction: number;
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function Payroll() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [items, setItems] = useState<PayrollItem[]>([
    { id: 1, guard: 'G-1001', basic: 2100, allowance: 210, deduction: 95 },
    { id: 2, guard: 'G-1002', basic: 2250, allowance: 180, deduction: 40 },
    { id: 3, guard: 'G-1003', basic: 1980, allowance: 160, deduction: 85 },
  ]);
  const [adjustment, setAdjustment] = useState<number>(0);

  const gross = useMemo(() => items.reduce((sum, row) => sum + row.basic + row.allowance, 0), [items]);
  const deductions = useMemo(() => items.reduce((sum, row) => sum + row.deduction, 0), [items]);
  const net = gross - deductions + adjustment;

  const recompute = () => {
    setItems((current) =>
      current.map((row) => ({
        ...row,
        allowance: Math.round(row.basic * 0.09),
      })),
    );
  };

  return (
    <div className='space-y-4'>
      <Card>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <div>
            <h1 className='text-xl font-semibold'>Payroll Month Detail — February 2026</h1>
            <p className='text-sm text-text-secondary'>Locking enforces read-only behavior for this month.</p>
          </div>
          <Badge variant={isLocked ? 'danger' : 'warning'}>{isLocked ? 'LOCKED' : 'OPEN'}</Badge>
        </div>

        <div className='mb-4 flex flex-wrap gap-2'>
          <Button onClick={recompute} disabled={isLocked}>
            Recompute
          </Button>
          <Button variant='secondary' onClick={() => setDrawerOpen(true)} disabled={isLocked}>
            Add Adjustment
          </Button>
          <Button variant={isLocked ? 'secondary' : 'danger'} onClick={() => setIsLocked((value) => !value)}>
            {isLocked ? 'Unlock (admin)' : 'Lock Month'}
          </Button>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Guard</TableHeaderCell>
              <TableHeaderCell>Basic</TableHeaderCell>
              <TableHeaderCell>Allowance</TableHeaderCell>
              <TableHeaderCell>Deductions</TableHeaderCell>
              <TableHeaderCell>Net</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className='font-medium'>{row.guard}</TableCell>
                <TableCell>{currency.format(row.basic)}</TableCell>
                <TableCell>
                  <Input
                    type='number'
                    min={0}
                    value={row.allowance}
                    disabled={isLocked}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setItems((current) => current.map((item) => (item.id === row.id ? { ...item, allowance: value } : item)));
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type='number'
                    min={0}
                    value={row.deduction}
                    disabled={isLocked}
                    onChange={(event) => {
                      const value = Number(event.target.value) || 0;
                      setItems((current) => current.map((item) => (item.id === row.id ? { ...item, deduction: value } : item)));
                    }}
                  />
                </TableCell>
                <TableCell className='font-semibold'>{currency.format(row.basic + row.allowance - row.deduction)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <div className='rounded-token-md border border-border-subtle bg-surface-muted p-3'>
            <p className='text-xs text-text-secondary'>Gross</p>
            <p className='text-lg font-semibold'>{currency.format(gross)}</p>
          </div>
          <div className='rounded-token-md border border-border-subtle bg-surface-muted p-3'>
            <p className='text-xs text-text-secondary'>Deductions</p>
            <p className='text-lg font-semibold'>{currency.format(deductions)}</p>
          </div>
          <div className='rounded-token-md border border-border-subtle bg-surface-muted p-3'>
            <p className='text-xs text-text-secondary'>Net + Adjustment</p>
            <p className='text-lg font-semibold'>{currency.format(net)}</p>
          </div>
        </div>
      </Card>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title='Payroll Adjustment'>
        <p className='mb-3 text-sm text-text-secondary'>Apply one adjustment amount to this payroll month.</p>
        <div className='mb-4'>
          <label className='mb-1 block text-xs text-text-secondary'>Adjustment Amount</label>
          <Input type='number' value={adjustment} onChange={(event) => setAdjustment(Number(event.target.value) || 0)} />
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='ghost' onClick={() => setDrawerOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setDrawerOpen(false)} disabled={isLocked}>
            Save Adjustment
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

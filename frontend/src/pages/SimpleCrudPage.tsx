import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { resolveStatusVariant } from '../lib/status';

export default function SimpleCrudPage({ title, path, fields }: { title: string; path: string; fields: string[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  const load = () => api<any[]>(`/${path}`).then(setItems);

  useEffect(() => {
    load();
  }, [path]);

  const submit = async (e: any) => {
    e.preventDefault();
    await api(`/${path}`, { method: 'POST', body: JSON.stringify(form) });
    setForm({});
    load();
  };

  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-semibold'>{title}</h1>
      <Card>
        <form onSubmit={submit} className='grid gap-3 md:grid-cols-3'>
          {fields.map((field) => (
            <Input
              key={field}
              placeholder={field}
              value={form[field] || ''}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          ))}
          <Button>Create</Button>
        </form>
      </Card>
      <Card className='overflow-x-auto p-0'>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Record</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <pre className='text-xs text-text-secondary'>{JSON.stringify(item, null, 2)}</pre>
                </TableCell>
                <TableCell>
                  {item.status ? (
                    <Badge variant={resolveStatusVariant(item.status)}>{item.status}</Badge>
                  ) : (
                    <Badge variant='neutral'>n/a</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

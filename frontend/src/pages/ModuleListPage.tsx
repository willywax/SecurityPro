import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { resolveStatusVariant } from '../lib/status';

type ModuleField = {
  key: string;
  label: string;
  primary?: boolean;
  sticky?: boolean;
  hideOnMobile?: boolean;
  render?: (item: any) => string;
};

type ModuleListPageProps = {
  title: string;
  path: string;
  fields: ModuleField[];
  filters?: string[];
  hideCardFallback?: boolean;
};

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function FieldValue({ item, field }: { item: any; field: ModuleField }) {
  const val = field.render ? field.render(item) : item[field.key];

  if (field.key === 'status') {
    return val ? <Badge variant={resolveStatusVariant(String(val))}>{String(val)}</Badge> : <Badge variant='neutral'>n/a</Badge>;
  }

  if (val === null || val === undefined || val === '') {
    return <span className='text-text-secondary'>—</span>;
  }

  return <span>{String(val)}</span>;
}

export default function ModuleListPage({ title, path, fields, filters = ['all'], hideCardFallback = false }: ModuleListPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  const primaryField = fields.find((field) => field.primary) ?? fields[0];

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await api<any[]>(`/${path}`);
        if (!alive) {
          return;
        }
        setItems(data);
      } catch (loadError: any) {
        if (!alive) {
          return;
        }
        setError(loadError?.message || `Failed to load ${title.toLowerCase()}.`);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [path, title]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query ||
        fields.some((field) => {
          const candidate = field.render ? field.render(item) : item[field.key];
          return candidate !== undefined && candidate !== null && String(candidate).toLowerCase().includes(query);
        });

      if (!matchesSearch) {
        return false;
      }

      if (activeFilter === 'all') {
        return true;
      }

      return String(item.status || '').toLowerCase() === activeFilter.toLowerCase();
    });
  }, [activeFilter, fields, items, search]);

  const hasStatusColumn = fields.some((field) => field.key === 'status');

  return (
    <div className='space-y-4'>
      <h1 className='text-2xl font-semibold'>{title}</h1>

      <Card>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
          <Input placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className='flex flex-wrap gap-2'>
            {filters.map((filter) => (
              <Button key={filter} variant={filter === activeFilter ? 'primary' : 'ghost'} onClick={() => setActiveFilter(filter)}>
                {formatLabel(filter)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {loading && <Card className='text-sm text-text-secondary'>Loading {title.toLowerCase()}...</Card>}
      {!loading && error && <Card className='text-sm text-danger'>Error: {error}</Card>}
      {!loading && !error && visibleItems.length === 0 && (
        <Card className='text-sm text-text-secondary'>No {title.toLowerCase()} found for the selected criteria.</Card>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <>
          <Card className={`p-0 ${hideCardFallback ? 'overflow-x-auto' : 'hidden md:block md:overflow-x-auto'}`}>
            <Table>
              <TableHead>
                <TableRow>
                  {fields.map((field) => (
                    <TableHeaderCell
                      key={field.key}
                      className={field.sticky ? 'sticky left-0 z-20 bg-surface-muted shadow-[4px_0_6px_-4px_rgba(0,0,0,0.2)]' : ''}
                    >
                      {field.label}
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell className='text-right'>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleItems.map((item) => (
                  <TableRow key={item.id}>
                    {fields.map((field) => (
                      <TableCell key={field.key} className={field.sticky ? 'sticky left-0 z-10 bg-surface shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]' : ''}>
                        <FieldValue item={item} field={field} />
                      </TableCell>
                    ))}
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button variant='ghost'>View</Button>
                        <Button variant='ghost'>Edit</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {!hideCardFallback && (
            <div className='space-y-3 md:hidden'>
              {visibleItems.map((item) => (
                <Card key={item.id} className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-base font-medium'>
                      <FieldValue item={item} field={primaryField} />
                    </h2>
                    {hasStatusColumn && <FieldValue item={item} field={fields.find((field) => field.key === 'status') as ModuleField} />}
                  </div>

                  <dl className='grid grid-cols-1 gap-2 text-sm'>
                    {fields
                      .filter((field) => !field.primary && !field.hideOnMobile && field.key !== 'status')
                      .map((field) => (
                        <div key={field.key} className='flex items-center justify-between gap-4'>
                          <dt className='text-text-secondary'>{field.label}</dt>
                          <dd>
                            <FieldValue item={item} field={field} />
                          </dd>
                        </div>
                      ))}
                  </dl>

                  <div className='flex justify-end gap-2'>
                    <Button variant='ghost'>View</Button>
                    <Button variant='ghost'>Edit</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className='flex items-center justify-between text-sm text-text-secondary'>
            <span>Showing {visibleItems.length} records</span>
            <div className='flex items-center gap-2'>
              <Button variant='ghost' disabled>
                Previous
              </Button>
              <span>Page 1</span>
              <Button variant='ghost' disabled>
                Next
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

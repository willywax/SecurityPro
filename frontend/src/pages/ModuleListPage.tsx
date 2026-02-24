import { useEffect, useMemo, useState } from 'react';
import type { ZodSchema } from 'zod';
import ToastAlert, { useToastAlerts } from '../components/feedback/ToastAlert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../components/ui/Table';
import { toOperatorMessage } from '../lib/api';
import { useRequestState } from '../lib/request-state';
import { resolveStatusVariant } from '../lib/status';

type ModuleField = {
  key: string;
  label: string;
  primary?: boolean;
  sticky?: boolean;
  hideOnMobile?: boolean;
  render?: (item: any) => string;
};

type CreateFormField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  options?: string[];
  placeholder?: string;
};

type ModuleListPageProps = {
  title: string;
  fields: ModuleField[];
  filters?: string[];
  hideCardFallback?: boolean;
  loadItems: () => Promise<any[]>;
  createConfig?: {
    schema: ZodSchema;
    initialValues: Record<string, string>;
    fields: CreateFormField[];
    submit: (values: any) => Promise<any>;
    mapPayload?: (values: any) => any;
  };
};

function formatLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function FieldValue({ item, field }: { item: any; field: ModuleField }) {
  const val = field.render ? field.render(item) : item[field.key];
  if (field.key === 'status') return val ? <Badge variant={resolveStatusVariant(String(val))}>{String(val)}</Badge> : <Badge variant='neutral'>n/a</Badge>;
  if (val === null || val === undefined || val === '') return <span className='text-text-secondary'>—</span>;
  return <span>{String(val)}</span>;
}

export default function ModuleListPage({ title, fields, filters = ['all'], hideCardFallback = false, loadItems, createConfig }: ModuleListPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [formValues, setFormValues] = useState<Record<string, string>>(createConfig?.initialValues || {});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const listState = useRequestState();
  const mutationState = useRequestState();
  const { toasts, push, dismiss } = useToastAlerts();

  const primaryField = fields.find((field) => field.primary) ?? fields[0];

  const load = async () => {
    try {
      listState.start();
      const data = await loadItems();
      setItems(data);
      listState.succeed();
    } catch (error) {
      const message = toOperatorMessage(error, `Failed to load ${title.toLowerCase()}.`);
      listState.fail(message);
      push('error', `${title} load failed`, message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || fields.some((field) => {
        const candidate = field.render ? field.render(item) : item[field.key];
        return candidate !== undefined && candidate !== null && String(candidate).toLowerCase().includes(query);
      });
      if (!matchesSearch) return false;
      if (activeFilter === 'all') return true;
      return String(item.status || '').toLowerCase() === activeFilter.toLowerCase();
    });
  }, [activeFilter, fields, items, search]);

  const onCreate = async () => {
    if (!createConfig) return;
    const result = createConfig.schema.safeParse(formValues);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const normalized: Record<string, string> = {};
      Object.entries(errors).forEach(([key, value]) => {
        if (value?.[0]) normalized[key] = value[0];
      });
      setFieldErrors(normalized);
      return;
    }

    setFieldErrors({});
    const payload = createConfig.mapPayload ? createConfig.mapPayload(result.data) : result.data;

    try {
      mutationState.start();
      setItems((prev) => [
        { id: `temp-${Date.now()}`, ...payload, status: payload.status || 'pending' },
        ...prev,
      ]);
      const created = await createConfig.submit(payload);
      setItems((prev) => [created, ...prev.filter((item) => !String(item.id).startsWith('temp-'))]);
      mutationState.succeed();
      setFormValues(createConfig.initialValues);
      push('success', `${title} created`, 'Record saved and list refreshed optimistically.');
      load();
    } catch (error) {
      await load();
      const message = toOperatorMessage(error, `Failed to create ${title.slice(0, -1).toLowerCase()}.`);
      mutationState.fail(message);
      push('error', `${title} save failed`, message);
    }
  };

  const hasStatusColumn = fields.some((field) => field.key === 'status');

  return (
    <div className='space-y-4'>
      <ToastAlert toasts={toasts} onDismiss={dismiss} />
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

      {createConfig && (
        <Card className='space-y-3'>
          <h2 className='text-base font-medium'>Create {title.slice(0, -1)}</h2>
          <div className='grid gap-3 md:grid-cols-2'>
            {createConfig.fields.map((field) => (
              <div key={field.key} className='space-y-1'>
                <label className='text-sm text-text-secondary'>{field.label}</label>
                {field.options ? (
                  <Select value={formValues[field.key] || ''} onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{formatLabel(option)}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={formValues[field.key] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
                {fieldErrors[field.key] && <p className='text-xs text-danger'>{fieldErrors[field.key]}</p>}
              </div>
            ))}
          </div>
          <div className='flex justify-end'>
            <Button onClick={onCreate} disabled={mutationState.isLoading}>{mutationState.isLoading ? 'Saving...' : 'Create'}</Button>
          </div>
        </Card>
      )}

      {listState.isLoading && <Card className='text-sm text-text-secondary'>Loading {title.toLowerCase()}...</Card>}
      {!listState.isLoading && listState.isError && <Card className='text-sm text-danger'>Error: {listState.error}</Card>}
      {!listState.isLoading && !listState.isError && visibleItems.length === 0 && <Card className='text-sm text-text-secondary'>No {title.toLowerCase()} found for the selected criteria.</Card>}

      {!listState.isLoading && !listState.isError && visibleItems.length > 0 && (
        <>
          <Card className={`p-0 ${hideCardFallback ? 'overflow-x-auto' : 'hidden md:block md:overflow-x-auto'}`}>
            <Table><TableHead><TableRow>
              {fields.map((field) => <TableHeaderCell key={field.key} className={field.sticky ? 'sticky left-0 z-20 bg-surface-muted shadow-[4px_0_6px_-4px_rgba(0,0,0,0.2)]' : ''}>{field.label}</TableHeaderCell>)}
              <TableHeaderCell className='text-right'>Actions</TableHeaderCell>
            </TableRow></TableHead>
              <TableBody>{visibleItems.map((item) => <TableRow key={item.id}>
                {fields.map((field) => <TableCell key={field.key} className={field.sticky ? 'sticky left-0 z-10 bg-surface shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]' : ''}><FieldValue item={item} field={field} /></TableCell>)}
                <TableCell className='text-right'><div className='flex justify-end gap-2'><Button variant='ghost'>View</Button><Button variant='ghost'>Edit</Button></div></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </Card>

          {!hideCardFallback && <div className='space-y-3 md:hidden'>{visibleItems.map((item) => (
            <Card key={item.id} className='space-y-3'>
              <div className='flex items-center justify-between'><h2 className='text-base font-medium'><FieldValue item={item} field={primaryField} /></h2>{hasStatusColumn && <FieldValue item={item} field={fields.find((field) => field.key === 'status') as ModuleField} />}</div>
              <dl className='grid grid-cols-1 gap-2 text-sm'>{fields.filter((field) => !field.primary && !field.hideOnMobile && field.key !== 'status').map((field) => <div key={field.key} className='flex items-center justify-between gap-4'><dt className='text-text-secondary'>{field.label}</dt><dd><FieldValue item={item} field={field} /></dd></div>)}</dl>
              <div className='flex justify-end gap-2'><Button variant='ghost'>View</Button><Button variant='ghost'>Edit</Button></div>
            </Card>
          ))}</div>}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  ArrowLeft, Loader2, Package, PackageCheck, TrendingDown, ArrowUpDown,
  Plus, Minus, AlertTriangle, RotateCcw, Pencil, X, Save,
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import issuanceService from '@/services/issuanceService';
import employeeService from '@/services/employeeService';
import siteService from '@/services/siteService';
import { toast } from 'sonner';

const TABS = ['transactions', 'active', 'returned', 'writeoffs'];

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('transactions');
  const [modal, setModal] = useState(null); // 'receive'|'issue'|'writeoff'|'adjust'|'edit'
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  const { data: item, isLoading } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => inventoryService.get(id),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventory-transactions', id],
    queryFn: () => inventoryService.getTransactions(id),
    enabled: !!id,
  });

  const { data: issuances = [] } = useQuery({
    queryKey: ['inventory-issuances', id],
    queryFn: () => inventoryService.getIssuances(id),
    enabled: !!id,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', 'issuance-options'],
    queryFn: () => employeeService.getAll({ page: 1, page_size: 100, status_filter: 'active' }),
  });

  const sitesQuery = useQuery({
    queryKey: ['sites', 'issuance-options'],
    queryFn: () => siteService.getAll({ page: 1, page_size: 100, status_filter: 'active' }),
  });

  const employees = employeesQuery.data?.data || [];
  const sites = sitesQuery.data?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', id] });
    queryClient.invalidateQueries({ queryKey: ['inventory-transactions', id] });
    queryClient.invalidateQueries({ queryKey: ['inventory-issuances', id] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const receiveMutation = useMutation({
    mutationFn: (data) => inventoryService.receive(id, data),
    onSuccess: () => { invalidate(); toast.success('Stock received'); setModal(null); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed'),
  });

  const writeOffMutation = useMutation({
    mutationFn: (data) => inventoryService.writeOff(id, data),
    onSuccess: () => { invalidate(); toast.success('Write-off recorded'); setModal(null); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed'),
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => inventoryService.adjust(id, data),
    onSuccess: () => { invalidate(); toast.success('Stock adjusted'); setModal(null); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed'),
  });

  const issueMutation = useMutation({
    mutationFn: (data) => issuanceService.issue(data),
    onSuccess: () => { invalidate(); toast.success('Asset issued'); setModal(null); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => inventoryService.update(id, data),
    onSuccess: () => { invalidate(); toast.success('Item updated'); setModal(null); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed'),
  });

  const openModal = (type) => {
    setErrors({});
    if (type === 'receive') setForm({ quantity: '', unit_cost: '', transaction_date: new Date().toISOString().split('T')[0], supplier: '', notes: '' });
    if (type === 'issue') setForm({ issued_to_type: 'employee', issued_to_id: '', quantity: '1', issue_date: new Date().toISOString().split('T')[0], issue_condition: 'good', notes: '' });
    if (type === 'writeoff') setForm({ quantity: '', reason: 'damaged', reason_details: '', write_off_date: new Date().toISOString().split('T')[0] });
    if (type === 'adjust') setForm({ quantity: '', direction: 'in', reason: '', notes: '' });
    if (type === 'edit') setForm({ item_name: item.item_name, description: item.description || '', unit_cost: item.unit_cost ?? '', notes: item.notes || '' });
    setModal(type);
  };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const submitReceive = () => {
    const e = {};
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Required, must be > 0';
    if (!form.transaction_date) e.transaction_date = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    receiveMutation.mutate({
      quantity: Number(form.quantity),
      unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
      transaction_date: form.transaction_date,
      supplier: form.supplier || undefined,
      notes: form.notes || undefined,
    });
  };

  const submitIssue = () => {
    const e = {};
    if (!form.issued_to_id?.trim()) e.issued_to_id = `Select a ${form.issued_to_type}`;
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Must be > 0';
    if (!form.issue_date) e.issue_date = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    issueMutation.mutate({
      item_id: id,
      issued_to_type: form.issued_to_type,
      issued_to_id: form.issued_to_id,
      quantity: Number(form.quantity),
      issue_date: form.issue_date,
      issue_condition: form.issue_condition,
      notes: form.notes || undefined,
    });
  };

  const submitWriteOff = () => {
    const e = {};
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Required';
    if (!form.reason_details.trim()) e.reason_details = 'Required';
    if (!form.write_off_date) e.write_off_date = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    writeOffMutation.mutate({
      quantity: Number(form.quantity),
      reason: form.reason,
      reason_details: form.reason_details,
      write_off_date: form.write_off_date,
    });
  };

  const submitAdjust = () => {
    const e = {};
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Required';
    if (!form.reason.trim()) e.reason = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    adjustMutation.mutate({
      quantity: Number(form.quantity),
      direction: form.direction,
      reason: form.reason,
      notes: form.notes || undefined,
    });
  };

  const submitEdit = () => {
    const e = {};
    if (!form.item_name.trim()) e.item_name = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    updateMutation.mutate({
      item_name: form.item_name,
      description: form.description || undefined,
      unit_cost: form.unit_cost !== '' ? Number(form.unit_cost) : undefined,
      notes: form.notes || undefined,
    });
  };

  const activeIssuances = issuances.filter(i => i.status === 'active' || i.status === 'partially_returned');
  const returnedIssuances = issuances.filter(i => i.status === 'fully_returned' || i.status === 'lost');
  const writeOffTransactions = transactions.filter(t => t.transaction_type === 'write_off');

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!item) return <div className="py-12 text-center text-slate-500">Item not found</div>;

  const available = item.available_count ?? (item.current_count - item.issued_count);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{item.item_name}</h1>
            <p className="text-slate-500 text-sm">{item.asset_type_name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => openModal('edit')}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
          <Button size="sm" onClick={() => openModal('receive')} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" /> Receive</Button>
          <Button size="sm" onClick={() => openModal('issue')} className="bg-blue-600 hover:bg-blue-700" disabled={available <= 0}><PackageCheck className="w-4 h-4 mr-1" /> Issue</Button>
          <Button size="sm" onClick={() => openModal('writeoff')} variant="destructive" disabled={available <= 0}><TrendingDown className="w-4 h-4 mr-1" /> Write Off</Button>
          <Button size="sm" onClick={() => openModal('adjust')} variant="outline"><ArrowUpDown className="w-4 h-4 mr-1" /> Adjust</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available', value: available, color: available === 0 ? 'text-red-600' : 'text-emerald-700' },
          { label: 'Issued', value: item.issued_count, color: 'text-amber-700' },
          { label: 'Written Off', value: item.written_off_count, color: 'text-slate-600' },
          { label: 'Total Value', value: `TZS ${item.total_value?.toLocaleString() ?? 0}`, color: 'text-slate-900' },
        ].map(({ label, value, color }) => (
          <Card key={label}><CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </CardContent></Card>
        ))}
      </div>

      {available === 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> No units available — all stock is issued or written off
        </div>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {[
          { key: 'transactions', label: 'Transactions' },
          { key: 'active', label: `Active Issuances (${activeIssuances.length})` },
          { key: 'returned', label: `Returned (${returnedIssuances.length})` },
          { key: 'writeoffs', label: `Write-offs (${writeOffTransactions.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'transactions' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No transactions yet</TableCell></TableRow>
              ) : transactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-slate-600">{t.transaction_date}</TableCell>
                  <TableCell><Badge className="capitalize bg-slate-100 text-slate-700">{t.transaction_type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <Badge className={t.direction === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{t.direction}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{t.quantity}</TableCell>
                  <TableCell className="text-slate-600">{t.reference_name || '—'}</TableCell>
                  <TableCell className="text-slate-500 max-w-[200px] truncate">{t.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'active' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issued To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeIssuances.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No active issuances</TableCell></TableRow>
              ) : activeIssuances.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.issued_to_name}</TableCell>
                  <TableCell className="capitalize text-slate-600">{i.issued_to_type}</TableCell>
                  <TableCell className="text-right">{i.quantity_issued}</TableCell>
                  <TableCell className="text-right">{i.quantity_returned}</TableCell>
                  <TableCell className="text-slate-600">{i.issue_date}</TableCell>
                  <TableCell className="text-slate-600">{i.expected_return_date || '—'}</TableCell>
                  <TableCell><Badge className="bg-blue-100 text-blue-700 capitalize">{i.status.replace('_', ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'returned' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issued To</TableHead>
                <TableHead className="text-right">Qty Issued</TableHead>
                <TableHead className="text-right">Qty Returned</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnedIssuances.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No returned issuances</TableCell></TableRow>
              ) : returnedIssuances.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.issued_to_name}</TableCell>
                  <TableCell className="text-right">{i.quantity_issued}</TableCell>
                  <TableCell className="text-right">{i.quantity_returned}</TableCell>
                  <TableCell className="text-slate-600">{i.actual_return_date || '—'}</TableCell>
                  <TableCell className="capitalize text-slate-600">{i.return_condition || '—'}</TableCell>
                  <TableCell><Badge className={i.status === 'lost' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} >{i.status.replace('_', ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'writeoffs' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writeOffTransactions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No write-offs</TableCell></TableRow>
              ) : writeOffTransactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-slate-600">{t.transaction_date}</TableCell>
                  <TableCell className="text-right text-red-700 font-semibold">{t.quantity}</TableCell>
                  <TableCell className="capitalize text-slate-700">{t.reference_name}</TableCell>
                  <TableCell className="text-slate-500">{t.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modals */}
      {modal === 'receive' && (
        <Modal title="Receive Stock" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Quantity *</label>
              <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={errors.quantity ? 'border-red-500' : ''} />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Unit Cost (TZS)</label>
              <Input type="number" min="0" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Date *</label>
              <Input type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} className={errors.transaction_date ? 'border-red-500' : ''} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Supplier</label>
              <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={submitReceive} disabled={receiveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {receiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Receive
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'issue' && (
        <Modal title="Issue Asset" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Issue To *</label>
              <Select value={form.issued_to_type} onValueChange={v => setForm(f => ({ ...f, issued_to_type: v, issued_to_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                {form.issued_to_type === 'employee' ? 'Employee' : 'Site'} *
              </label>
              <Select
                value={form.issued_to_id}
                onValueChange={v => set('issued_to_id', v)}
                disabled={
                  form.issued_to_type === 'employee'
                    ? employeesQuery.isLoading || employeesQuery.isError || employees.length === 0
                    : sitesQuery.isLoading || sitesQuery.isError || sites.length === 0
                }
              >
                <SelectTrigger className={errors.issued_to_id ? 'border-red-500' : ''}>
                  <SelectValue
                    placeholder={
                      form.issued_to_type === 'employee'
                        ? employeesQuery.isLoading
                          ? 'Loading employees...'
                          : employeesQuery.isError
                            ? 'Failed to load employees'
                            : employees.length === 0
                              ? 'No active employees available'
                              : 'Select employee'
                        : sitesQuery.isLoading
                          ? 'Loading sites...'
                          : sitesQuery.isError
                            ? 'Failed to load sites'
                            : sites.length === 0
                              ? 'No active sites available'
                              : 'Select site'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(form.issued_to_type === 'employee' ? employees : sites).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {form.issued_to_type === 'employee'
                        ? `${option.full_name || [option.first_name, option.last_name].filter(Boolean).join(' ')}${option.employee_id ? ` (${option.employee_id})` : ''}`
                        : `${option.site_name}${option.client_name ? ` (${option.client_name})` : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.issued_to_id && <p className="text-xs text-red-600 mt-1">{errors.issued_to_id}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Quantity *</label>
                <Input type="number" min="1" max={available} value={form.quantity} onChange={e => set('quantity', e.target.value)} className={errors.quantity ? 'border-red-500' : ''} />
                {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Condition</label>
                <Select value={form.issue_condition} onValueChange={v => set('issue_condition', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Issue Date *</label>
              <Input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={submitIssue} disabled={issueMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {issueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Issue
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'writeoff' && (
        <Modal title="Write Off Stock" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Quantity *</label>
              <Input type="number" min="1" max={available} value={form.quantity} onChange={e => set('quantity', e.target.value)} className={errors.quantity ? 'border-red-500' : ''} />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Reason</label>
              <Select value={form.reason} onValueChange={v => set('reason', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['damaged', 'lost', 'expired', 'obsolete', 'other'].map(r => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Details *</label>
              <Input value={form.reason_details} onChange={e => set('reason_details', e.target.value)} placeholder="Describe what happened" className={errors.reason_details ? 'border-red-500' : ''} />
              {errors.reason_details && <p className="text-xs text-red-600 mt-1">{errors.reason_details}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Date *</label>
              <Input type="date" value={form.write_off_date} onChange={e => set('write_off_date', e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={submitWriteOff} disabled={writeOffMutation.isPending} variant="destructive">
                {writeOffMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Write Off
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'adjust' && (
        <Modal title="Adjust Stock" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Direction</label>
              <Select value={form.direction} onValueChange={v => set('direction', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">In (add stock)</SelectItem>
                  <SelectItem value="out">Out (remove stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Quantity *</label>
              <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} className={errors.quantity ? 'border-red-500' : ''} />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Reason *</label>
              <Input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Reason for adjustment" className={errors.reason ? 'border-red-500' : ''} />
              {errors.reason && <p className="text-xs text-red-600 mt-1">{errors.reason}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={submitAdjust} disabled={adjustMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {adjustMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Adjust
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'edit' && (
        <Modal title="Edit Item" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Item Name *</label>
              <Input value={form.item_name} onChange={e => set('item_name', e.target.value)} className={errors.item_name ? 'border-red-500' : ''} />
              {errors.item_name && <p className="text-xs text-red-600 mt-1">{errors.item_name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Unit Cost (TZS)</label>
              <Input type="number" min="0" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={submitEdit} disabled={updateMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save
              </Button>
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InventoryDetail;

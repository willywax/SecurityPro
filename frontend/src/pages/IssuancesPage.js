import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, PackageCheck, AlertTriangle, RotateCcw, X } from 'lucide-react';
import issuanceService from '@/services/issuanceService';
import { toast } from 'sonner';

const statusColors = {
  active: 'bg-blue-100 text-blue-700',
  partially_returned: 'bg-amber-100 text-amber-700',
  fully_returned: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
};

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

const IssuancesPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [returning, setReturning] = useState(null);
  const [returnForm, setReturnForm] = useState({ quantity_returned: '', return_condition: 'good', actual_return_date: new Date().toISOString().split('T')[0], notes: '' });
  const [returnErrors, setReturnErrors] = useState({});

  const { data: issuances = [], isLoading, isError } = useQuery({
    queryKey: ['issuances', { statusFilter, typeFilter }],
    queryFn: () => issuanceService.list({
      status_filter: statusFilter !== 'all' ? statusFilter : undefined,
      issued_to_type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, data }) => issuanceService.return(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issuances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Return recorded');
      setReturning(null);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Return failed'),
  });

  const openReturn = (iss) => {
    setReturning(iss);
    const outstanding = iss.quantity_issued - iss.quantity_returned;
    setReturnForm({
      quantity_returned: String(outstanding),
      return_condition: 'good',
      actual_return_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setReturnErrors({});
  };

  const submitReturn = () => {
    const e = {};
    if (!returnForm.quantity_returned || Number(returnForm.quantity_returned) <= 0) e.quantity_returned = 'Must be > 0';
    if (Object.keys(e).length) { setReturnErrors(e); return; }
    returnMutation.mutate({
      id: returning.id,
      data: {
        quantity_returned: Number(returnForm.quantity_returned),
        return_condition: returnForm.return_condition,
        actual_return_date: returnForm.actual_return_date || undefined,
        notes: returnForm.notes || undefined,
      },
    });
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = issuances.filter(i => i.is_overdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Issuances</h1>
          <p className="text-slate-500 text-sm mt-1">Track assets issued to employees and sites</p>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4" /> {overdueCount} overdue return{overdueCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="partially_returned">Partially Returned</SelectItem>
            <SelectItem value="fully_returned">Fully Returned</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Recipient Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recipients</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="site">Site</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : isError ? (
        <Card><CardContent className="py-12 text-center text-red-600">Failed to load issuances</CardContent></Card>
      ) : issuances.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No issuances found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Issued To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuances.map(iss => {
                const isOverdue = iss.is_overdue;
                return (
                  <TableRow key={iss.id} className={isOverdue ? 'bg-amber-50' : ''}>
                    <TableCell className="font-medium text-slate-900">
                      {iss.item_name || '—'}
                      {iss.asset_type_name && <span className="block text-xs text-slate-400">{iss.asset_type_name}</span>}
                    </TableCell>
                    <TableCell>{iss.issued_to_name}</TableCell>
                    <TableCell className="capitalize text-slate-600">{iss.issued_to_type}</TableCell>
                    <TableCell className="text-right">{iss.quantity_issued}</TableCell>
                    <TableCell className="text-right">{iss.quantity_returned}</TableCell>
                    <TableCell className="text-slate-600">{iss.issue_date}</TableCell>
                    <TableCell className={isOverdue ? 'text-amber-700 font-medium' : 'text-slate-600'}>
                      {iss.expected_return_date || '—'}
                      {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[iss.status] || 'bg-slate-100 text-slate-700'}>
                        {iss.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(iss.status === 'active' || iss.status === 'partially_returned') && (
                        <Button size="sm" variant="outline" onClick={() => openReturn(iss)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Return
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {returning && (
        <Modal title={`Return: ${returning.item_name}`} onClose={() => setReturning(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Outstanding: <strong>{returning.quantity_issued - returning.quantity_returned}</strong> unit(s)
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Quantity Returning *</label>
              <Input
                type="number"
                min="1"
                max={returning.quantity_issued - returning.quantity_returned}
                value={returnForm.quantity_returned}
                onChange={e => setReturnForm(f => ({ ...f, quantity_returned: e.target.value }))}
                className={returnErrors.quantity_returned ? 'border-red-500' : ''}
              />
              {returnErrors.quantity_returned && <p className="text-xs text-red-600 mt-1">{returnErrors.quantity_returned}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Return Condition</label>
              <Select value={returnForm.return_condition} onValueChange={v => setReturnForm(f => ({ ...f, return_condition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['good', 'fair', 'poor', 'damaged', 'lost'].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Return Date</label>
              <Input type="date" value={returnForm.actual_return_date} onChange={e => setReturnForm(f => ({ ...f, actual_return_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
              <Input value={returnForm.notes} onChange={e => setReturnForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={submitReturn} disabled={returnMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {returnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirm Return
              </Button>
              <Button variant="outline" onClick={() => setReturning(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default IssuancesPage;

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { ArrowLeft, Loader2, Save, Edit, Trash2, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  draft:    { label: 'Draft',    badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  approved: { label: 'Approved', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid:     { label: 'Paid',     badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const fmt = (n) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';

const fmtMonth = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const computeNet = (base, allowances, overtime, deductions) =>
  Math.max(
    0,
    (parseFloat(base) || 0) +
    (parseFloat(allowances) || 0) +
    (parseFloat(overtime) || 0) -
    (parseFloat(deductions) || 0)
  ).toFixed(2);

const PayrollDetail = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    base_salary: '',
    allowances: '',
    deductions: '',
    overtime: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const r = await api.get(`/payroll/${id}`);
        setPayroll(r.data);
        setForm({
          base_salary: r.data.base_salary,
          allowances: r.data.allowances,
          deductions: r.data.deductions,
          overtime: r.data.overtime,
          notes: r.data.notes || '',
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Payroll record not found');
          navigate('/payroll');
        } else {
          toast.error('Failed to load payroll record');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [id, api, navigate]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const cancelEdit = () => {
    setForm({
      base_salary: payroll.base_salary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      overtime: payroll.overtime,
      notes: payroll.notes || '',
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        base_salary: parseFloat(form.base_salary),
        allowances: parseFloat(form.allowances) || 0,
        deductions: parseFloat(form.deductions) || 0,
        overtime: parseFloat(form.overtime) || 0,
        notes: form.notes || null,
      };
      const r = await api.put(`/payroll/${id}`, payload);
      setPayroll(r.data);
      setIsEditing(false);
      toast.success('Payroll record updated');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const r = await api.put(`/payroll/${id}`, { status: newStatus });
      setPayroll(r.data);
      toast.success(newStatus === 'approved' ? 'Payroll approved' : 'Payroll marked as paid');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/payroll/${id}`);
      toast.success('Payroll record deleted');
      navigate('/payroll');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to delete');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  const previewNet = isEditing
    ? computeNet(form.base_salary, form.allowances, form.overtime, form.deductions)
    : null;

  return (
    <div className="space-y-6" data-testid="payroll-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/payroll">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {payroll?.employee_name || 'Employee'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-sm text-slate-500">{payroll?.payroll_id}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm text-slate-600">{fmtMonth(payroll?.payroll_month)}</span>
                <Badge variant="outline" className={statusConfig[payroll?.status]?.badge}>
                  {statusConfig[payroll?.status]?.label || payroll?.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Status action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-2 pl-16 sm:pl-0">
            {payroll?.status === 'draft' && (
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => handleStatusChange('approved')}
                data-testid="btn-approve"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
            {payroll?.status === 'approved' && (
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleStatusChange('paid')}
                data-testid="btn-mark-paid"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Mark as Paid
              </Button>
            )}
            {payroll?.status === 'draft' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid="btn-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete payroll record for {payroll?.employee_name}{' '}
                      ({fmtMonth(payroll?.payroll_month)})? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="btn-confirm-delete"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {/* Main card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payroll Details</CardTitle>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="btn-edit">
              <Edit className="w-4 h-4 mr-2" />Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0F172A] hover:bg-slate-800"
                data-testid="btn-save"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Salary</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.base_salary}
                  onChange={e => set('base_salary', e.target.value)}
                  data-testid="input-base-salary"
                />
              </div>
              <div className="space-y-2">
                <Label>Allowances</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.allowances}
                  onChange={e => set('allowances', e.target.value)}
                  data-testid="input-allowances"
                />
              </div>
              <div className="space-y-2">
                <Label>Overtime</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.overtime}
                  onChange={e => set('overtime', e.target.value)}
                  data-testid="input-overtime"
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.deductions}
                  onChange={e => set('deductions', e.target.value)}
                  data-testid="input-deductions"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Optional notes"
                  data-testid="input-notes"
                />
              </div>
              {/* Net pay preview */}
              <div className="md:col-span-2 p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Calculated Net Pay</span>
                <span className="text-xl font-bold text-slate-900 font-mono">${previewNet}</span>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Employee</dt>
                <dd className="mt-1 text-sm text-slate-900 font-medium">{payroll?.employee_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Employee ID</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{payroll?.employee_code || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Payroll Month</dt>
                <dd className="mt-1 text-sm text-slate-900">{fmtMonth(payroll?.payroll_month)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Base Salary</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{fmt(payroll?.base_salary)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Allowances</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{fmt(payroll?.allowances)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Overtime</dt>
                <dd className="mt-1 text-sm text-slate-900 font-mono">{fmt(payroll?.overtime)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Deductions</dt>
                <dd className="mt-1 text-sm text-slate-700 font-mono">- {fmt(payroll?.deductions)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant="outline" className={statusConfig[payroll?.status]?.badge}>
                    {statusConfig[payroll?.status]?.label || payroll?.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Net Pay</dt>
                <dd className="mt-1 text-xl font-bold text-slate-900 font-mono">{fmt(payroll?.net_pay)}</dd>
              </div>
              {payroll?.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-sm font-medium text-slate-500">Notes</dt>
                  <dd className="mt-1 text-sm text-slate-900">{payroll.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollDetail;

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { ArrowLeft, Loader2, Save, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'draft',    label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid',     label: 'Paid' },
];

const computeNet = (base, allowances, overtime, deductions) =>
  Math.max(
    0,
    (parseFloat(base) || 0) +
    (parseFloat(allowances) || 0) +
    (parseFloat(overtime) || 0) -
    (parseFloat(deductions) || 0)
  ).toFixed(2);

// ============ SINGLE ENTRY TAB ============

const SingleEntryForm = ({ api, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({
    employee_id: '',
    payroll_month: '',
    zone_id: '',
    base_salary: '',
    allowances: '0',
    deductions: '0',
    overtime: '0',
    status: 'draft',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeContractInfo, setActiveContractInfo] = useState(null); // { contract_number, salary_amount } or null
  const [noContractWarning, setNoContractWarning] = useState(false);

  useEffect(() => {
    api.get('/employees?page_size=100&status_filter=active')
      .then(r => setEmployees(r.data.employees || []))
      .catch(() => {});
    api.get('/zones')
      .then(r => setZones(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [api]);

  // Auto-fetch active contract salary when employee is selected
  useEffect(() => {
    if (!form.employee_id) {
      setActiveContractInfo(null);
      setNoContractWarning(false);
      return;
    }
    api.get(`/employees/${form.employee_id}/active-contract`)
      .then(r => {
        const contract = r.data;
        setActiveContractInfo(contract);
        setNoContractWarning(false);
        setForm(prev => ({ ...prev, base_salary: String(contract.salary_amount || '') }));
      })
      .catch(() => {
        setActiveContractInfo(null);
        setNoContractWarning(true);
        setForm(prev => ({ ...prev, base_salary: '' }));
      });
  }, [form.employee_id, api]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.employee_id) e.employee_id = 'Select an employee';
    if (!form.payroll_month) e.payroll_month = 'Select a payroll month';
    if (!form.base_salary || isNaN(form.base_salary) || parseFloat(form.base_salary) < 0)
      e.base_salary = noContractWarning
        ? 'No active contract — salary not set. Assign a contract first.'
        : 'Enter a valid base salary';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        employee_id: form.employee_id,
        payroll_month: form.payroll_month,
        zone_id: form.zone_id || null,
        base_salary: parseFloat(form.base_salary),
        allowances: parseFloat(form.allowances) || 0,
        deductions: parseFloat(form.deductions) || 0,
        overtime: parseFloat(form.overtime) || 0,
        status: form.status,
        notes: form.notes || null,
      };
      const r = await api.post('/payroll', payload);
      toast.success('Payroll record created');
      onSuccess(r.data.id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create payroll');
    } finally {
      setSaving(false);
    }
  };

  const net = computeNet(form.base_salary, form.allowances, form.overtime, form.deductions);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single Payroll Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={form.employee_id} onValueChange={v => set('employee_id', v)}>
              <SelectTrigger
                className={errors.employee_id ? 'border-red-500' : ''}
                data-testid="select-employee"
              >
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && <p className="text-sm text-red-500">{errors.employee_id}</p>}
          </div>

          <div className="space-y-2">
            <Label>Payroll Month *</Label>
            <Input
              type="month"
              value={form.payroll_month}
              onChange={e => set('payroll_month', e.target.value)}
              className={errors.payroll_month ? 'border-red-500' : ''}
              data-testid="input-payroll-month"
            />
            {errors.payroll_month && <p className="text-sm text-red-500">{errors.payroll_month}</p>}
          </div>

          <div className="space-y-2">
            <Label>Zone</Label>
            <Select value={form.zone_id} onValueChange={v => set('zone_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select zone (optional)" />
              </SelectTrigger>
              <SelectContent>
                {zones.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Base Salary *</Label>
            {activeContractInfo && (
              <p className="text-xs text-emerald-600 font-medium">
                From contract #{activeContractInfo.contract_number}: TZS {Number(activeContractInfo.salary_amount || 0).toLocaleString()}
              </p>
            )}
            {noContractWarning && (
              <p className="text-xs text-red-500 font-medium">
                ⚠ No active contract found. Salary not set automatically.
              </p>
            )}
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.base_salary}
              onChange={e => set('base_salary', e.target.value)}
              placeholder="0.00"
              className={errors.base_salary ? 'border-red-500' : ''}
              data-testid="input-base-salary"
            />
            {errors.base_salary && <p className="text-sm text-red-500">{errors.base_salary}</p>}
          </div>

          <div className="space-y-2">
            <Label>Allowances</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.allowances}
              onChange={e => set('allowances', e.target.value)}
              placeholder="0.00"
              data-testid="input-allowances"
            />
          </div>

          <div className="space-y-2">
            <Label>Overtime</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.overtime}
              onChange={e => set('overtime', e.target.value)}
              placeholder="0.00"
              data-testid="input-overtime"
            />
          </div>

          <div className="space-y-2">
            <Label>Deductions</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.deductions}
              onChange={e => set('deductions', e.target.value)}
              placeholder="0.00"
              data-testid="input-deductions"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger data-testid="select-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes"
              data-testid="input-notes"
            />
          </div>
        </div>

        {/* No contract warning banner */}
        {noContractWarning && form.employee_id && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ No active contract found. Please assign a contract before adding to payroll.
          </div>
        )}

        {/* Net Pay Preview */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Calculated Net Pay</span>
          <span className="text-xl font-bold text-slate-900 font-mono">${net}</span>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[#0F172A] hover:bg-slate-800"
            data-testid="btn-create-single"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              : <><Save className="w-4 h-4 mr-2" />Create Record</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ BULK ENTRY TAB ============

const BulkEntryForm = ({ api, onSuccess }) => {
  const [payrollMonth, setPayrollMonth] = useState('');
  const [status, setStatus] = useState('draft');
  const [rows, setRows] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEmployees = async (month) => {
    if (!month) return;
    setLoadingEmployees(true);
    try {
      const r = await api.get('/employees?page_size=100&status_filter=active');
      const emps = r.data.employees || [];
      setRows(emps.map(e => ({
        employee_id: e.id,
        employee_name: `${e.first_name} ${e.last_name}`,
        employee_code: e.employee_id,
        base_salary: '',
        allowances: '0',
        deductions: '0',
        overtime: '0',
        notes: '',
      })));
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleMonthChange = (month) => {
    setPayrollMonth(month);
    if (month) {
      loadEmployees(month);
    } else {
      setRows([]);
    }
  };

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!payrollMonth) { toast.error('Select a payroll month'); return; }
    if (rows.length === 0) { toast.error('No employees in the list'); return; }

    for (const r of rows) {
      if (!r.base_salary || isNaN(r.base_salary) || parseFloat(r.base_salary) < 0) {
        toast.error(`Enter a valid base salary for ${r.employee_name}`);
        return;
      }
    }

    setSaving(true);
    try {
      const entries = rows.map(r => ({
        employee_id: r.employee_id,
        base_salary: parseFloat(r.base_salary),
        allowances: parseFloat(r.allowances) || 0,
        deductions: parseFloat(r.deductions) || 0,
        overtime: parseFloat(r.overtime) || 0,
        notes: r.notes || null,
      }));
      const r = await api.post('/payroll/bulk', { payroll_month: payrollMonth, status, entries });
      const { created, skipped } = r.data;
      toast.success(
        `Created ${created.length} record(s)${skipped.length > 0 ? `, skipped ${skipped.length}` : ''}`
      );
      onSuccess();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create payroll records');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Payroll Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month + Status row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-2 flex-1">
            <Label>Payroll Month *</Label>
            <Input
              type="month"
              value={payrollMonth}
              onChange={e => handleMonthChange(e.target.value)}
              data-testid="input-bulk-month"
            />
          </div>
          <div className="space-y-2 sm:w-[180px]">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-bulk-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Employees table */}
        {loadingEmployees ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
            <span className="text-sm text-slate-500">Loading employees...</span>
          </div>
        ) : rows.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 font-medium">
                {rows.length} employee(s) loaded — remove rows you don't need
              </p>
              <Badge variant="outline" className="font-mono">{payrollMonth}</Badge>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold min-w-[160px]">Employee</TableHead>
                    <TableHead className="font-semibold min-w-[130px]">Base Salary *</TableHead>
                    <TableHead className="font-semibold min-w-[110px]">Allowances</TableHead>
                    <TableHead className="font-semibold min-w-[110px]">Overtime</TableHead>
                    <TableHead className="font-semibold min-w-[110px]">Deductions</TableHead>
                    <TableHead className="font-semibold min-w-[100px] text-right">Net Pay</TableHead>
                    <TableHead className="font-semibold min-w-[140px]">Notes</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const net = computeNet(row.base_salary, row.allowances, row.overtime, row.deductions);
                    return (
                      <TableRow key={row.employee_id} data-testid={`bulk-row-${row.employee_id}`}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{row.employee_name}</p>
                            <p className="text-xs text-slate-500 font-mono">{row.employee_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.base_salary}
                            onChange={e => updateRow(idx, 'base_salary', e.target.value)}
                            placeholder="0.00"
                            className="w-28"
                            data-testid={`input-bulk-base-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.allowances}
                            onChange={e => updateRow(idx, 'allowances', e.target.value)}
                            placeholder="0.00"
                            className="w-24"
                            data-testid={`input-bulk-allowances-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.overtime}
                            onChange={e => updateRow(idx, 'overtime', e.target.value)}
                            placeholder="0.00"
                            className="w-24"
                            data-testid={`input-bulk-overtime-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.deductions}
                            onChange={e => updateRow(idx, 'deductions', e.target.value)}
                            placeholder="0.00"
                            className="w-24"
                            data-testid={`input-bulk-deductions-${idx}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-mono font-semibold text-slate-900">${net}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.notes}
                            onChange={e => updateRow(idx, 'notes', e.target.value)}
                            placeholder="Optional"
                            className="w-32"
                            data-testid={`input-bulk-notes-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => removeRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            data-testid={`btn-remove-row-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">{rows.length} record(s) will be created</p>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-[#0F172A] hover:bg-slate-800"
                data-testid="btn-submit-bulk"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4 mr-2" />Create {rows.length} Records</>}
              </Button>
            </div>
          </>
        ) : payrollMonth ? (
          <div className="py-8 text-center text-slate-500">
            <DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm">No active employees found.</p>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm">Select a payroll month above to load all active employees</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============ MAIN PAGE ============

const PayrollCreate = () => {
  const navigate = useNavigate();
  const { api } = useAuth();

  return (
    <div className="space-y-6" data-testid="payroll-create-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/payroll">
          <Button variant="ghost" size="icon" data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Payroll</h1>
          <p className="text-slate-500 text-sm mt-1">Create one or many payroll records</p>
        </div>
      </div>

      <Tabs defaultValue="single">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="single" data-testid="tab-single">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk" data-testid="tab-bulk">Bulk Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <SingleEntryForm api={api} onSuccess={(id) => navigate(`/payroll/${id}`)} />
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <BulkEntryForm api={api} onSuccess={() => navigate('/payroll')} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayrollCreate;

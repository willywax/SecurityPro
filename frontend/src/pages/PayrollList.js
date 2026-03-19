import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Loader2,
} from 'lucide-react';

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

const PayrollList = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 50, totalPages: 1 });

  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.get('/employees?page_size=100').then(r => setEmployees(r.data.employees || [])).catch(() => {});
  }, [api]);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('page_size', pagination.pageSize.toString());
      if (monthFilter) params.set('month', monthFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (employeeFilter !== 'all') params.set('employee_id', employeeFilter);

      const r = await api.get(`/payroll?${params.toString()}`);
      setPayrolls(r.data.payrolls);
      setPagination(prev => ({ ...prev, total: r.data.total, totalPages: r.data.total_pages }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.page, pagination.pageSize, monthFilter, statusFilter, employeeFilter]);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  const clearFilters = () => {
    setMonthFilter('');
    setStatusFilter('all');
    setEmployeeFilter('all');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const hasFilters = monthFilter || statusFilter !== 'all' || employeeFilter !== 'all';

  return (
    <div className="space-y-6" data-testid="payroll-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll</h1>
          <p className="text-slate-500 text-sm mt-1">Manage employee payroll records</p>
        </div>
        <Link to="/payroll/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-payroll">
            <Plus className="w-4 h-4 mr-2" />
            Add Payroll
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => { setMonthFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="w-full sm:w-[180px]"
          data-testid="input-month-filter"
        />
        <Select
          value={employeeFilter}
          onValueChange={(v) => { setEmployeeFilter(v); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-employee-filter">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} data-testid="btn-clear-filters">
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : payrolls.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No payroll records found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {hasFilters
                ? 'Try adjusting your filters'
                : 'Create your first payroll record to get started'}
            </p>
            {!hasFilters && (
              <Link to="/payroll/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />Add Payroll
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Payroll ID</TableHead>
                  <TableHead className="font-semibold">Month</TableHead>
                  <TableHead className="font-semibold text-right">Base Salary</TableHead>
                  <TableHead className="font-semibold text-right">Net Pay</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/payroll/${p.id}`)}
                    data-testid={`payroll-row-${p.id}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{p.employee_name || 'Unknown'}</p>
                        {p.employee_code && (
                          <p className="text-xs text-slate-500 font-mono">{p.employee_code}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-600">{p.payroll_id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">{fmtMonth(p.payroll_month)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono text-slate-700">{fmt(p.base_salary)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono font-semibold text-slate-900">{fmt(p.net_pay)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[p.status]?.badge}>
                        {statusConfig[p.status]?.label || p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  data-testid="btn-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 min-w-[100px] text-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  data-testid="btn-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PayrollList;

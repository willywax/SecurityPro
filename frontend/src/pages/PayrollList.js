import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Plus, ChevronLeft, ChevronRight, DollarSign, Loader2 } from 'lucide-react';
import payrollService from '@/services/payrollService';
import zoneService from '@/services/zoneService';
import { formatTZS } from '@/utils/currency';

const statusConfig = {
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  approved: { label: 'Approved', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid: { label: 'Paid', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const fmtMonth = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const PayrollList = () => {
  const navigate = useNavigate();
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const zonesQuery = useQuery({ queryKey: ['zones', 'payroll-filter'], queryFn: () => zoneService.getAll() });
  const zones = zonesQuery.data || [];

  const payrollsQuery = useQuery({
    queryKey: ['payroll', { page, pageSize, monthFilter, statusFilter, zoneFilter }],
    queryFn: () => payrollService.getAll({ page, page_size: pageSize, month: monthFilter || undefined, status_filter: statusFilter !== 'all' ? statusFilter : undefined, zone_id: zoneFilter !== 'all' ? zoneFilter : undefined }),
  });

  const payrolls = payrollsQuery.data?.data || [];
  const total = payrollsQuery.data?.total || 0;
  const totalPages = payrollsQuery.data?.totalPages || 1;

  return (
    <div className="space-y-6" data-testid="payroll-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll</h1>
          <p className="text-slate-500 text-sm mt-1">Manage employee payroll records</p>
        </div>
        <Link to="/payroll/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Payroll</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Input type="month" value={monthFilter} onChange={(event) => { setMonthFilter(event.target.value); setPage(1); }} className="w-full sm:w-[180px]" />
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{Object.entries(statusConfig).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={(value) => { setZoneFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Zones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {payrollsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : payrolls.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 mb-1">No payroll records found</h3><p className="text-slate-500 text-sm mb-4">Try adjusting your filters or create a payroll record.</p><Link to="/payroll/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Payroll</Button></Link></CardContent></Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">Employee</TableHead><TableHead className="font-semibold">Payroll ID</TableHead><TableHead className="font-semibold">Month</TableHead><TableHead className="font-semibold">Zone</TableHead><TableHead className="font-semibold text-right">Base Salary</TableHead><TableHead className="font-semibold text-right">Net Pay</TableHead><TableHead className="font-semibold">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {payrolls.map((payroll) => (
                  <TableRow key={payroll.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/payroll/${payroll.id}`)}>
                    <TableCell><div><p className="font-medium text-slate-900">{payroll.employee_name || 'Unknown'}</p><p className="text-xs text-slate-500 font-mono">{payroll.employee_code || ''}</p></div></TableCell>
                    <TableCell><span className="font-mono text-sm text-slate-600">{payroll.payroll_id}</span></TableCell>
                    <TableCell>{fmtMonth(payroll.payroll_month)}</TableCell>
                    <TableCell>{payroll.zone_name || '-'}</TableCell>
                    <TableCell className="text-right">{formatTZS(payroll.base_salary)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatTZS(payroll.net_pay)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusConfig[payroll.status]?.badge}>{statusConfig[payroll.status]?.label || payroll.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} records</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-slate-600 min-w-[100px] text-center">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((value) => value + 1)} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PayrollList;

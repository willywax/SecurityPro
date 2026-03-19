import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
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
import { Input } from '../components/ui/input';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
} from 'lucide-react';

const statusConfig = {
  draft:   { label: 'Draft',   badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent:    { label: 'Sent',    badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid:    { label: 'Paid',    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  overdue: { label: 'Overdue', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const fmtTZS = (n) => `TZS ${Number(n || 0).toLocaleString('en-US')}`;

const fmtDate = (d) => {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const InvoiceList = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 50, totalPages: 1 });

  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    api.get('/clients?page_size=100').then(r => setClients(r.data.clients || [])).catch(() => {});
  }, [api]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('page_size', pagination.pageSize.toString());
      if (clientFilter !== 'all') params.set('client_id', clientFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (monthFilter) params.set('month', monthFilter);

      const r = await api.get(`/invoices?${params.toString()}`);
      setInvoices(r.data.invoices);
      setPagination(prev => ({ ...prev, total: r.data.total, totalPages: r.data.total_pages }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.page, pagination.pageSize, clientFilter, statusFilter, monthFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const clearFilters = () => {
    setClientFilter('all');
    setStatusFilter('all');
    setMonthFilter('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const hasFilters = clientFilter !== 'all' || statusFilter !== 'all' || monthFilter;

  return (
    <div className="space-y-6" data-testid="invoices-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client invoices and billing</p>
        </div>
        <Link to="/invoices/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-new-invoice">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select
          value={clientFilter}
          onValueChange={(v) => { setClientFilter(v); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-client-filter">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
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
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => { setMonthFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="w-full sm:w-[180px]"
          data-testid="input-month-filter"
        />
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
      ) : invoices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No invoices found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {hasFilters ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
            </p>
            {!hasFilters && (
              <Link to="/invoices/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />New Invoice
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
                  <TableHead className="font-semibold">Invoice #</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Issue Date</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    data-testid={`invoice-row-${inv.id}`}
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {inv.invoice_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-900">
                        {inv.client_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{fmtDate(inv.issue_date)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">{fmtDate(inv.due_date)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono font-semibold text-slate-900">
                        {fmtTZS(inv.grand_total)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[inv.status]?.badge}>
                        {statusConfig[inv.status]?.label || inv.status}
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
                {pagination.total} invoices
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

export default InvoiceList;

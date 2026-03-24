import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Plus, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import clientService from '@/services/clientService';
import invoiceService from '@/services/invoiceService';
import { formatTZS } from '@/utils/currency';

const statusConfig = {
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent: { label: 'Sent', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid: { label: 'Paid', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  overdue: { label: 'Overdue', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const InvoiceList = () => {
  const navigate = useNavigate();
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const clientsQuery = useQuery({ queryKey: ['clients', 'invoice-filter'], queryFn: () => clientService.getAll({ page: 1, page_size: 100 }) });
  const invoicesQuery = useQuery({
    queryKey: ['invoices', { page, pageSize, clientFilter, statusFilter, monthFilter }],
    queryFn: () => invoiceService.getAll({ page, page_size: pageSize, client_id: clientFilter !== 'all' ? clientFilter : undefined, status_filter: statusFilter !== 'all' ? statusFilter : undefined, month: monthFilter || undefined }),
  });

  const clients = clientsQuery.data?.data || [];
  const invoices = invoicesQuery.data?.data || [];
  const total = invoicesQuery.data?.total || 0;
  const totalPages = invoicesQuery.data?.totalPages || 1;

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Manage client invoices and billing</p>
        </div>
        <Link to="/invoices/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />New Invoice</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={clientFilter} onValueChange={(value) => { setClientFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Clients</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{Object.entries(statusConfig).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="month" value={monthFilter} onChange={(event) => { setMonthFilter(event.target.value); setPage(1); }} className="w-full sm:w-[180px]" />
      </div>

      {invoicesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : invoices.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 mb-1">No invoices found</h3><p className="text-slate-500 text-sm mb-4">Try adjusting your filters or create a new invoice.</p><Link to="/invoices/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />New Invoice</Button></Link></CardContent></Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">Invoice #</TableHead><TableHead className="font-semibold">Client</TableHead><TableHead className="font-semibold">Issue Date</TableHead><TableHead className="font-semibold">Due Date</TableHead><TableHead className="font-semibold text-right">Amount</TableHead><TableHead className="font-semibold">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <TableCell><span className="font-mono text-sm font-semibold text-slate-900">{invoice.invoice_id}</span></TableCell>
                    <TableCell>{invoice.client_name || '-'}</TableCell>
                    <TableCell>{fmtDate(invoice.issue_date)}</TableCell>
                    <TableCell>{fmtDate(invoice.due_date)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatTZS(invoice.grand_total)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusConfig[invoice.status]?.badge}>{statusConfig[invoice.status]?.label || invoice.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} invoices</p>
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

export default InvoiceList;

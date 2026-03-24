import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Search, Plus, ChevronLeft, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import clientService from '@/services/clientService';
import siteService from '@/services/siteService';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
};

const SiteList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const clientsQuery = useQuery({ queryKey: ['clients', 'filter'], queryFn: () => clientService.getAll({ page: 1, page_size: 100 }) });
  const sitesQuery = useQuery({
    queryKey: ['sites', { page, pageSize, search, clientFilter, statusFilter }],
    queryFn: () => siteService.getAll({ page, page_size: pageSize, search: search || undefined, client_id: clientFilter !== 'all' ? clientFilter : undefined, status_filter: statusFilter !== 'all' ? statusFilter : undefined }),
  });

  const sites = sitesQuery.data?.data || [];
  const clients = clientsQuery.data?.data || [];
  const total = sitesQuery.data?.total || 0;
  const totalPages = sitesQuery.data?.totalPages || 1;

  return (
    <div className="space-y-6" data-testid="sites-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sites</h1>
          <p className="text-slate-500 text-sm mt-1">Manage security deployment sites</p>
        </div>
        <Link to="/sites/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Site</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" placeholder="Search by name, region, district..." />
        </div>
        <Select value={clientFilter} onValueChange={(value) => { setClientFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sitesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : sites.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 mb-1">No sites found</h3><p className="text-slate-500 text-sm mb-4">Try adjusting your filters or add a new site.</p><Link to="/sites/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Site</Button></Link></CardContent></Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Site</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Region / District</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/sites/${site.id}`)}>
                    <TableCell><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><MapPin className="w-5 h-5 text-emerald-600" /></div><p className="font-medium text-slate-900">{site.site_name}</p></div></TableCell>
                    <TableCell><span className="font-mono text-sm text-slate-600">{site.site_id}</span></TableCell>
                    <TableCell>{site.client_name || '-'}</TableCell>
                    <TableCell>{[site.region, site.district].filter(Boolean).join(' / ') || '-'}</TableCell>
                    <TableCell>{site.contact_person || site.contact_phone || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[site.status]}>{site.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} sites</p>
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

export default SiteList;

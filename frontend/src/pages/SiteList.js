import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Loader2,
} from 'lucide-react';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
};

const statusLabels = { active: 'Active', inactive: 'Inactive', under_review: 'Under Review' };

const SiteList = () => {
  const { api } = useAuth();

  const [sites, setSites] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load clients for filter dropdown
  useEffect(() => {
    api.get('/clients?page_size=100')
      .then(r => setClients(r.data.clients))
      .catch(console.error);
  }, [api]);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('page_size', pagination.pageSize.toString());
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (clientFilter !== 'all') params.set('client_id', clientFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await api.get(`/sites?${params.toString()}`);
      setSites(response.data.sites);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.total_pages,
      }));
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.page, pagination.pageSize, debouncedSearch, clientFilter, statusFilter]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  return (
    <div className="space-y-6" data-testid="sites-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sites</h1>
          <p className="text-slate-500 text-sm mt-1">Manage security deployment sites</p>
        </div>
        <Link to="/sites/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-site">
            <Plus className="w-4 h-4 mr-2" />
            Add Site
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, region, district..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="pl-9"
            data-testid="input-search-sites"
          />
        </div>
        <Select
          value={clientFilter}
          onValueChange={(v) => {
            setClientFilter(v);
            setPagination(p => ({ ...p, page: 1 }));
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-client-filter">
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
          onValueChange={(v) => {
            setStatusFilter(v);
            setPagination(p => ({ ...p, page: 1 }));
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-site-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No sites found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || clientFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first site'}
            </p>
            {!search && clientFilter === 'all' && statusFilter === 'all' && (
              <Link to="/sites/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />Add Site
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
                  <TableRow
                    key={site.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => window.location.href = `/sites/${site.id}`}
                    data-testid={`site-row-${site.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="font-medium text-slate-900">{site.site_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-600">{site.site_id}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">{site.client_name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        {site.region && <p className="text-slate-600">{site.region}</p>}
                        {site.district && <p className="text-sm text-slate-500">{site.district}</p>}
                        {!site.region && !site.district && <span className="text-slate-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {site.contact_person && <p className="text-slate-600">{site.contact_person}</p>}
                        {site.contact_phone && <p className="text-sm text-slate-500">{site.contact_phone}</p>}
                        {!site.contact_person && !site.contact_phone && <span className="text-slate-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[site.status]}>
                        {statusLabels[site.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} sites
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

export default SiteList;

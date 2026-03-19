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
  Shield,
  Package,
  Wifi,
  Lock,
  Zap,
  Box,
  Minus,
  Loader2,
} from 'lucide-react';

const typeConfig = {
  gun:      { label: 'Gun',      Icon: Shield,  bg: 'bg-red-100',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700 border-red-200' },
  uniform:  { label: 'Uniform',  Icon: Package, bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  radio:    { label: 'Radio',    Icon: Wifi,    bg: 'bg-blue-100',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  baton:    { label: 'Baton',    Icon: Minus,   bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  handcuff: { label: 'Handcuff', Icon: Lock,    bg: 'bg-slate-100',  text: 'text-slate-600',  badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  torch:    { label: 'Torch',    Icon: Zap,     bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  other:    { label: 'Other',    Icon: Box,     bg: 'bg-teal-100',   text: 'text-teal-600',   badge: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const statusConfig = {
  available:   { label: 'Available',   badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  issued:      { label: 'Issued',      badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  lost:        { label: 'Lost',        badge: 'bg-red-100 text-red-700 border-red-200' },
  maintenance: { label: 'Maintenance', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired:     { label: 'Retired',     badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const conditionConfig = {
  new:  { label: 'New',  badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  good: { label: 'Good', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  fair: { label: 'Fair', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  poor: { label: 'Poor', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const AssetList = () => {
  const { api } = useAuth();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('page_size', pagination.pageSize.toString());
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await api.get(`/assets?${params.toString()}`);
      setAssets(response.data.assets);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        totalPages: response.data.total_pages,
      }));
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [api, pagination.page, pagination.pageSize, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  return (
    <div className="space-y-6" data-testid="assets-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assets</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage security equipment</p>
        </div>
        <Link to="/assets/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-asset">
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, serial no, asset ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className="pl-9"
            data-testid="input-search-assets"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPagination(p => ({ ...p, page: 1 }));
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-type-filter">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeConfig).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
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
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : assets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No assets found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first asset'}
            </p>
            {!search && typeFilter === 'all' && statusFilter === 'all' && (
              <Link to="/assets/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />Add Asset
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
                  <TableHead className="font-semibold">Asset</TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Serial No</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const type = typeConfig[asset.asset_type] || typeConfig.other;
                  const TypeIcon = type.Icon;
                  return (
                    <TableRow
                      key={asset.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => window.location.href = `/assets/${asset.id}`}
                      data-testid={`asset-row-${asset.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${type.bg} flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon className={`w-5 h-5 ${type.text}`} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{asset.name}</p>
                            {asset.asset_tag && (
                              <p className="text-xs text-slate-500">{asset.asset_tag}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">{asset.asset_id}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={type.badge}>{type.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600 font-mono text-sm">{asset.serial_number || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[asset.status]?.badge}>
                          {statusConfig[asset.status]?.label || asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={conditionConfig[asset.condition]?.badge}>
                          {conditionConfig[asset.condition]?.label || asset.condition}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} assets
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

export default AssetList;

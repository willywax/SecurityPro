import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Search, Plus, ChevronLeft, ChevronRight, Shield, Package, Wifi, Lock, Zap, Box, Minus, Loader2 } from 'lucide-react';
import assetService from '@/services/assetService';

const typeConfig = {
  gun: { label: 'Gun', Icon: Shield, bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-700 border-red-200' },
  uniform: { label: 'Uniform', Icon: Package, bg: 'bg-slate-100', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  radio: { label: 'Radio', Icon: Wifi, bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  baton: { label: 'Baton', Icon: Minus, bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  handcuff: { label: 'Handcuff', Icon: Lock, bg: 'bg-slate-100', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  torch: { label: 'Torch', Icon: Zap, bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  other: { label: 'Other', Icon: Box, bg: 'bg-teal-100', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const statusConfig = {
  available: { label: 'Available', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  issued: { label: 'Issued', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  lost: { label: 'Lost', badge: 'bg-red-100 text-red-700 border-red-200' },
  maintenance: { label: 'Maintenance', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired: { label: 'Retired', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const conditionConfig = {
  new: { label: 'New', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  good: { label: 'Good', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  fair: { label: 'Fair', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  poor: { label: 'Poor', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const AssetList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { page, pageSize, search, typeFilter, statusFilter }],
    queryFn: () => assetService.getAll({ page, page_size: pageSize, search: search || undefined, asset_type: typeFilter !== 'all' ? typeFilter : undefined, status_filter: statusFilter !== 'all' ? statusFilter : undefined }),
  });

  const assets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6" data-testid="assets-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assets</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage security equipment</p>
        </div>
        <Link to="/assets/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Asset</Button></Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" placeholder="Search by name, serial, asset ID..." />
        </div>
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{Object.entries(typeConfig).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{Object.entries(statusConfig).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : assets.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 mb-1">No assets found</h3><p className="text-slate-500 text-sm mb-4">Try adjusting your filters or add a new asset.</p><Link to="/assets/new"><Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Asset</Button></Link></CardContent></Card>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead className="font-semibold">Asset</TableHead><TableHead className="font-semibold">ID</TableHead><TableHead className="font-semibold">Type</TableHead><TableHead className="font-semibold">Serial No</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold">Condition</TableHead></TableRow></TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const type = typeConfig[asset.asset_type] || typeConfig.other;
                  const TypeIcon = type.Icon;
                  return <TableRow key={asset.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}><TableCell><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${type.bg} flex items-center justify-center`}><TypeIcon className={`w-5 h-5 ${type.text}`} /></div><div><p className="font-medium text-slate-900">{asset.name}</p><p className="text-xs text-slate-500">{asset.asset_tag || ''}</p></div></div></TableCell><TableCell><span className="font-mono text-sm text-slate-600">{asset.asset_id}</span></TableCell><TableCell><Badge variant="outline" className={type.badge}>{type.label}</Badge></TableCell><TableCell>{asset.serial_number || '-'}</TableCell><TableCell><Badge variant="outline" className={statusConfig[asset.status]?.badge}>{statusConfig[asset.status]?.label || asset.status}</Badge></TableCell><TableCell><Badge variant="outline" className={conditionConfig[asset.condition]?.badge}>{conditionConfig[asset.condition]?.label || asset.condition}</Badge></TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} assets</p>
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

export default AssetList;

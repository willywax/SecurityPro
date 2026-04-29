import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Search, Plus, Loader2, Package } from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import assetTypeService from '@/services/assetTypeService';

const InventoryList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: inventoryData, isLoading, isError } = useQuery({
    queryKey: ['inventory', { typeFilter, statusFilter }],
    queryFn: () => inventoryService.list({
      asset_type_id: typeFilter !== 'all' ? typeFilter : undefined,
      status_filter: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: assetTypeService.list,
  });

  const items = (inventoryData?.items || []).filter(item =>
    !search || item.item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">
            {inventoryData?.total ?? 0} item{inventoryData?.total !== 1 ? 's' : ''} in stock
          </p>
        </div>
        <Link to="/inventory/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Search items..." />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {assetTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.type_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : isError ? (
        <Card><CardContent className="py-12 text-center text-red-600">Failed to load inventory</CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No items found</p>
          <Link to="/inventory/new"><Button className="mt-4 bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Item</Button></Link>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Written Off</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/inventory/${item.id}`)}>
                  <TableCell className="font-medium text-slate-900">{item.item_name}</TableCell>
                  <TableCell className="text-slate-600">{item.asset_type_name || '—'}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.available_count === 0 ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                      {item.available_count}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-amber-700">{item.issued_count}</TableCell>
                  <TableCell className="text-right text-slate-500">{item.written_off_count}</TableCell>
                  <TableCell className="text-right text-slate-600">
                    {item.unit_cost != null ? `TZS ${item.unit_cost.toLocaleString()}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    TZS {item.total_value?.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default InventoryList;

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, MapPin, Loader2, Users, Globe } from 'lucide-react';
import regionService from '@/services/regionService';
import zoneService from '@/services/zoneService';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
};

const RegionList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const zonesQuery = useQuery({
    queryKey: ['zones', 'filter'],
    queryFn: () => zoneService.getAll(),
  });

  const regionsQuery = useQuery({
    queryKey: ['regions', { zoneFilter, statusFilter }],
    queryFn: () => regionService.getAll({
      zone_id: zoneFilter !== 'all' ? zoneFilter : undefined,
      status_filter: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const zones = zonesQuery.data || [];
  const regions = (regionsQuery.data || []).filter((r) =>
    !search || r.region_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="regions-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Regions</h1>
          <p className="text-slate-500 text-sm mt-1">Sub-areas within zones</p>
        </div>
        <Link to="/regions/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Add Region
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search regions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {regionsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : regionsQuery.isError ? (
        <Card className="border-red-200">
          <CardContent className="py-12 text-center text-red-600">Failed to load regions</CardContent>
        </Card>
      ) : regions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No regions found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || zoneFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first region to get started'}
            </p>
            {!search && zoneFilter === 'all' && statusFilter === 'all' && (
              <Link to="/regions/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Add Region</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Region Name</TableHead>
                <TableHead className="font-semibold">Zone</TableHead>
                <TableHead className="font-semibold">Employees</TableHead>
                <TableHead className="font-semibold">Sites</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((region) => (
                <TableRow
                  key={region.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/regions/${region.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="font-medium text-slate-900">{region.region_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      {region.zone_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Users className="w-3.5 h-3.5" />{region.employee_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{region.site_count}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[region.status]}>
                      {region.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RegionList;

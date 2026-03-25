import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Plus, Search, Globe, Loader2, Users, MapPin } from 'lucide-react';
import zoneService from '@/services/zoneService';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ZoneList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const zonesQuery = useQuery({
    queryKey: ['zones', { statusFilter }],
    queryFn: () => zoneService.getAll({ status_filter: statusFilter !== 'all' ? statusFilter : undefined }),
  });

  const zones = (zonesQuery.data || []).filter((z) =>
    !search || z.zone_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="zones-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Zones</h1>
          <p className="text-slate-500 text-sm mt-1">Top-level operational geographic areas</p>
        </div>
        <Link to="/zones/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-2" />
            Add Zone
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search zones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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

      {zonesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : zonesQuery.isError ? (
        <Card className="border-red-200">
          <CardContent className="py-12 text-center text-red-600">Failed to load zones</CardContent>
        </Card>
      ) : zones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No zones found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first zone to get started'}
            </p>
            {!search && statusFilter === 'all' && (
              <Link to="/zones/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />Add Zone
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Zone Name</TableHead>
                <TableHead className="font-semibold">Regions</TableHead>
                <TableHead className="font-semibold">Manager</TableHead>
                <TableHead className="font-semibold">Employees</TableHead>
                <TableHead className="font-semibold">Sites</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => {
                const activeManagers = (zone.managers || []).filter((m) => m.active);
                return (
                  <TableRow
                    key={zone.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/zones/${zone.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="font-medium text-slate-900">{zone.zone_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5" />
                        {zone.region_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {activeManagers.length > 0
                        ? activeManagers.map((m) => m.employee_name).join(', ')
                        : <span className="text-slate-400 italic">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5" />
                        {zone.employee_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{zone.site_count}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[zone.status]}>
                        {zone.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ZoneList;

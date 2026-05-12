import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Users, MapPin, Loader2, Building2 } from 'lucide-react';
import allocationService from '@/services/allocationService';
import zoneService from '@/services/zoneService';

const AllocationsPage = () => {
  const [zoneFilter, setZoneFilter] = useState('all');

  const zonesQuery = useQuery({
    queryKey: ['zones', 'filter'],
    queryFn: () => zoneService.getAll(),
  });
  const zones = zonesQuery.data || [];

  const overviewQuery = useQuery({
    queryKey: ['allocations', 'zone-overview', zoneFilter],
    queryFn: () =>
      zoneFilter !== 'all'
        ? allocationService.getZoneOverview(zoneFilter)
        : Promise.resolve([]),
    enabled: zoneFilter !== 'all',
  });

  const availableQuery = useQuery({
    queryKey: ['allocations', 'available-guards', zoneFilter],
    queryFn: () =>
      allocationService.getAvailableGuards(
        zoneFilter !== 'all' ? { zone_id: zoneFilter } : {}
      ),
  });

  const sites = overviewQuery.data || [];
  const availableGuards = availableQuery.data || [];

  const totalAllocated = sites.reduce((sum, s) => sum + (s.allocated_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Guard Allocations</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of guard deployment across sites</p>
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{availableGuards.length}</p>
                <p className="text-sm text-slate-500">Available Guards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalAllocated}</p>
                <p className="text-sm text-slate-500">Guards Deployed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{sites.length}</p>
                <p className="text-sm text-slate-500">
                  {zoneFilter !== 'all' ? 'Sites in Zone' : 'Sites'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone site cards */}
      {zoneFilter === 'all' ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Select a zone</h3>
            <p className="text-slate-500 text-sm">Choose a zone above to see per-site allocation details</p>
          </CardContent>
        </Card>
      ) : overviewQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : sites.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No sites found</h3>
            <p className="text-slate-500 text-sm">This zone has no sites yet</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Sites</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => {
              const guardCount = site.allocated_count || 0;

              return (
                <Card key={site.site_id} className="hover:border-slate-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-slate-900 leading-tight">
                        {site.site_name}
                      </CardTitle>
                      {site.client_name && (
                        <span className="text-xs text-slate-400 shrink-0">{site.client_name}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Guards deployed</span>
                      <span className="font-semibold text-slate-900">{guardCount}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link to={`/sites/${site.site_id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <MapPin className="w-3.5 h-3.5 mr-1.5" />
                          View Site
                        </Button>
                      </Link>
                      <Link to={`/sites/${site.site_id}?tab=guards`} className="flex-1">
                        <Button size="sm" className="w-full text-xs bg-[#0F172A] hover:bg-slate-800">
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          Manage Guards
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available guards list */}
      {availableGuards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Available Guards{zoneFilter !== 'all' ? ' in Zone' : ''}
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {availableGuards.map((guard) => (
                  <div key={guard.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                        {guard.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{guard.full_name}</p>
                        <p className="text-xs text-slate-500">{guard.guard_no || guard.employee_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {guard.region_name && (
                        <span className="text-xs text-slate-400">{guard.region_name}</span>
                      )}
                      <Link to={`/employees/${guard.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AllocationsPage;

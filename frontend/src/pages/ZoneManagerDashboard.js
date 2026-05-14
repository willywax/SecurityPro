import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Users, MapPin, Building2, Globe, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Loader2, FileWarning,
  ClipboardList, UserX,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import dashboardService from '@/services/dashboardService';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatLastUpdated = (d) => {
  if (!d) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'Just now';
  return `${diff} min${diff === 1 ? '' : 's'} ago`;
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const statusBadgeClass = (status) => {
  if (!status || status === 'normal') return 'bg-emerald-100 text-emerald-700';
  if (status === 'incident') return 'bg-red-100 text-red-700';
  if (status === 'warning') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const StatCard = ({ icon: Icon, label, value, subText, iconBg = 'bg-slate-100', iconColor = 'text-slate-600', highlight }) => (
  <Card className={`border-slate-200 ${highlight ? 'border-red-200 bg-red-50' : ''}`}>
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-700' : 'text-slate-900'}`}>{value ?? 0}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {subText && <p className="text-xs text-slate-400 mt-1">{subText}</p>}
    </CardContent>
  </Card>
);

const ZoneManagerDashboard = () => {
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'zone-manager'],
    queryFn: dashboardService.getZoneManagerSummary,
    refetchInterval: 300_000,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-800 font-medium">Failed to load dashboard</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  // No zones assigned
  if (data?.no_zones_message) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
        <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">No Zones Assigned</h2>
        <p className="text-slate-500">{data.no_zones_message}</p>
      </div>
    );
  }

  const { summary, zones, todays_logs, allocation_gaps } = data || {};
  const zoneNames = zones?.map((z) => z.zone_name).join(', ') || '—';
  const unsubmitted = summary?.unsubmitted_logs_today ?? 0;

  return (
    <div className="space-y-6" data-testid="zone-manager-dashboard">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {getGreeting()}, {user?.first_name}!
            </h2>
            <p className="text-slate-500 mt-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              Managing: <span className="font-medium text-slate-700">{zoneNames}</span>
            </p>
            <p className="text-sm text-slate-400 mt-1">{todayLabel()}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {lastUpdated && <span>Updated {formatLastUpdated(lastUpdated)}</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards — Guards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Guards"
          value={summary?.total_employees}
          subText="In your zones"
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Available"
          value={summary?.available_guards}
          subText="Ready to deploy"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={MapPin}
          label="Allocated"
          value={summary?.allocated_guards}
          subText="On active sites"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={UserX}
          label="Unstaffed Sites"
          value={allocation_gaps?.length ?? 0}
          subText="Sites with no guards"
          iconBg={allocation_gaps?.length > 0 ? 'bg-red-100' : 'bg-slate-100'}
          iconColor={allocation_gaps?.length > 0 ? 'text-red-600' : 'text-slate-600'}
          highlight={allocation_gaps?.length > 0}
        />
      </div>

      {/* ── Summary Cards — Operations ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MapPin}
          label="Total Sites"
          value={summary?.total_sites}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          icon={Building2}
          label="Total Clients"
          value={summary?.total_clients}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          icon={ClipboardList}
          label="Logs Missing Today"
          value={unsubmitted}
          subText="Sites with no log yet"
          iconBg={unsubmitted > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconColor={unsubmitted > 0 ? 'text-amber-600' : 'text-slate-600'}
          highlight={false}
        />
        <StatCard
          icon={FileWarning}
          label="Contracts Expiring"
          value={summary?.contracts_expiring_soon}
          subText="Within 30 days"
          iconBg={summary?.contracts_expiring_soon > 0 ? 'bg-amber-100' : 'bg-slate-100'}
          iconColor={summary?.contracts_expiring_soon > 0 ? 'text-amber-600' : 'text-slate-600'}
        />
      </div>

      {/* ── Contracts Expiry Alert ───────────────────────────────────────── */}
      {(summary?.contracts_expiring_soon ?? 0) > 0 && (
        <Link to="/reports/employees?contractExpiry=30">
          <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl hover:border-amber-300 transition-colors cursor-pointer">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0">
              <FileWarning className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {summary.contracts_expiring_soon} contract{summary.contracts_expiring_soon !== 1 ? 's' : ''} expiring in the next 30 days
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Click to view employees with expiring contracts</p>
            </div>
          </div>
        </Link>
      )}

      {/* ── Today's Site Logs ────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Today's Site Logs
              <span className="text-xs font-normal text-slate-400">{todayLabel()}</span>
            </CardTitle>
            <Link to="/daily-logs/new">
              <Button size="sm" variant="outline" className="text-xs">+ New Log</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!todays_logs?.length ? (
            <p className="px-6 py-8 text-sm text-slate-500">No active sites found in your zones.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-center">Logs Today</TableHead>
                  <TableHead>Last Submitted</TableHead>
                  <TableHead className="text-center">Guards Present</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todays_logs.map((entry) => {
                  const missing = entry.logs_submitted_today === 0;
                  return (
                    <TableRow
                      key={String(entry.site_id)}
                      className={missing ? 'bg-amber-50 hover:bg-amber-100' : ''}
                    >
                      <TableCell className="font-medium text-slate-900">{entry.site_name}</TableCell>
                      <TableCell className="text-center">
                        {missing ? (
                          <span className="text-amber-600 font-medium text-sm">No log yet</span>
                        ) : (
                          <span className="font-semibold">{entry.logs_submitted_today}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatTime(entry.last_log_time)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {entry.guards_present != null
                          ? `${entry.guards_present} / ${entry.guards_total}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {entry.overall_status ? (
                          <Badge className={statusBadgeClass(entry.overall_status)}>
                            {entry.overall_status.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {missing ? (
                          <Link to="/daily-logs/new">
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 px-3">
                              Submit Log
                            </Button>
                          </Link>
                        ) : (
                          <Link to="/daily-logs">
                            <Button size="sm" variant="outline" className="text-xs h-7 px-3">
                              View
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Allocation Gaps (Unstaffed Sites) ───────────────────────────── */}
      {allocation_gaps?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Sites Under-Staffed ({allocation_gaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead className="text-center">Allocated Guards</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocation_gaps.map((gap) => (
                  <TableRow key={String(gap.site_id)} className="bg-red-50 hover:bg-red-100">
                    <TableCell className="font-medium text-slate-900">{gap.site_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-red-100 text-red-700">
                        {gap.allocated_guards} guard{gap.allocated_guards !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/sites/${gap.site_id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-3 border-red-200 text-red-700 hover:bg-red-50">
                          Assign Guard
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── My Zones Overview ────────────────────────────────────────────── */}
      {zones?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">My Zones</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <Link key={String(zone.zone_id)} to={`/zones/${zone.zone_id}`}>
                <Card className="border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center">
                        <Globe className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-slate-900 truncate">{zone.zone_name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{zone.region_count}</p>
                        <p className="text-xs text-slate-500">Regions</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{zone.site_count}</p>
                        <p className="text-xs text-slate-500">Sites</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{zone.employee_count}</p>
                        <p className="text-xs text-slate-500">Guards</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default ZoneManagerDashboard;

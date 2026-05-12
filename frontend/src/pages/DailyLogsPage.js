import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ClipboardList, Plus, Loader2, MapPin, AlertTriangle, Users } from 'lucide-react';
import dailyLogService from '@/services/dailyLogService';
import zoneService from '@/services/zoneService';
import siteService from '@/services/siteService';
import { useZoneScope } from '@/hooks/useZoneScope';

const SHIFT_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
  full_day: 'Full Day',
};

const STATUS_CONFIG = {
  normal: { label: 'Normal', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  incident: { label: 'Incident', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const DailyLogsPage = () => {
  const navigate = useNavigate();
  const { isFullAccess } = useZoneScope();

  const [zoneFilter, setZoneFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const zonesQuery = useQuery({
    queryKey: ['zones', 'filter'],
    queryFn: () => zoneService.getAll(),
    enabled: isFullAccess,
  });
  const zones = zonesQuery.data || [];

  const sitesQuery = useQuery({
    queryKey: ['sites', 'filter'],
    queryFn: () => siteService.getAll(),
  });
  const sites = sitesQuery.data?.data || [];

  const params = {};
  if (zoneFilter !== 'all') params.zone_id = zoneFilter;
  if (siteFilter !== 'all') params.site_id = siteFilter;
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const logsQuery = useQuery({
    queryKey: ['daily-logs', params],
    queryFn: () => dailyLogService.getAll(params),
  });
  const logs = logsQuery.data || [];

  const filteredSites = zoneFilter !== 'all'
    ? sites.filter(s => {
        // For zone filter, ideally we'd filter by zone — sites list doesn't have zone_id directly,
        // so we just show all sites when no reliable zone→site mapping exists on the client.
        return true;
      })
    : sites;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Shift reports submitted by zone managers</p>
        </div>
        <Button
          onClick={() => navigate('/daily-logs/new')}
          className="bg-[#0F172A] hover:bg-slate-800 gap-2"
        >
          <Plus className="w-4 h-4" />
          Submit New Log
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {isFullAccess && (
          <Select value={zoneFilter} onValueChange={(v) => { setZoneFilter(v); setSiteFilter('all'); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map(z => (
                <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {filteredSites.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.site_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="From"
          />
          <span className="text-slate-400 text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="To"
          />
        </div>

        {(dateFrom || dateTo || zoneFilter !== 'all' || siteFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(''); setDateTo(''); setZoneFilter('all'); setSiteFilter('all'); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      {logsQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No logs found</h3>
            <p className="text-slate-500 text-sm mb-4">Submit a daily log to get started</p>
            <Button
              onClick={() => navigate('/daily-logs/new')}
              className="bg-[#0F172A] hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit New Log
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <Link key={log.id} to={`/daily-logs/${log.id}`}>
              <Card className="hover:border-slate-300 transition-colors cursor-pointer">
                <CardContent className="py-4 px-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Left: site + date info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 truncate">{log.site_name || 'Unknown Site'}</p>
                        <StatusBadge status={log.overall_status} />
                        {log.incident_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            {log.incident_count} incident{log.incident_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {log.zone_name || 'No zone'}
                        </span>
                        <span>{formatDate(log.log_date)}</span>
                        <span className="capitalize">{SHIFT_LABELS[log.shift] || log.shift}</span>
                        <span>{formatTime(log.submission_time)}</span>
                        {log.submitted_by_name && <span>by {log.submitted_by_name}</span>}
                      </div>
                    </div>

                    {/* Right: attendance summary */}
                    <div className="flex items-center gap-1 text-sm shrink-0">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{log.present_count}</span>
                      <span className="text-slate-400">/ {log.total_guards} present</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyLogsPage;

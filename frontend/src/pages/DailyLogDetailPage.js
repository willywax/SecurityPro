import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronLeft, Loader2, MapPin, Clock, User, Users, AlertTriangle } from 'lucide-react';
import dailyLogService from '@/services/dailyLogService';

const SHIFT_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
  full_day: 'Full Day',
};

const INCIDENT_TYPE_LABELS = {
  guard_absent: 'Guard Absent',
  theft: 'Theft / Robbery',
  complaint: 'Client Complaint',
  injury: 'Injury / Accident',
  misconduct: 'Misconduct',
  other: 'Other',
};

const STATUS_CONFIG = {
  normal: { label: 'Normal', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  incident: { label: 'Incident', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
};

const ATTENDANCE_CONFIG = {
  present: { label: 'Present', className: 'bg-emerald-100 text-emerald-700' },
  absent: { label: 'Absent', className: 'bg-red-100 text-red-700' },
  late: { label: 'Late', className: 'bg-amber-100 text-amber-700' },
  left_early: { label: 'Left Early', className: 'bg-slate-100 text-slate-600' },
};

const SEVERITY_CONFIG = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', className: 'bg-red-100 text-red-700' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
};

const formatTime = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const DailyLogDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const logQuery = useQuery({
    queryKey: ['daily-log', id],
    queryFn: () => dailyLogService.getById(id),
    enabled: !!id,
  });
  const log = logQuery.data;

  if (logQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">Log not found.</p>
        <Button variant="ghost" onClick={() => navigate('/daily-logs')} className="mt-4">
          Back to Daily Logs
        </Button>
      </div>
    );
  }

  const presentCount = log.attendance.filter(a => a.status === 'present').length;
  const totalGuards = log.attendance.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/daily-logs')} className="-ml-2">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Daily Logs
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900">{log.site_name || 'Unknown Site'}</h1>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                <span>{log.zone_name || 'No zone'}</span>
              </div>
            </div>
            <StatusBadge status={log.overall_status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Date</p>
              <p className="text-sm font-medium text-slate-900">{formatDate(log.log_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Shift</p>
              <p className="text-sm font-medium text-slate-900 capitalize">
                {SHIFT_LABELS[log.shift] || log.shift}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Submitted at</p>
              <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatTime(log.submission_time)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Submitted by</p>
              <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {log.submitted_by_name || 'Unknown'}
              </p>
            </div>
          </div>

          {log.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{log.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Attendance
            </CardTitle>
            <span className="text-sm font-medium text-slate-600">
              {presentCount} / {totalGuards} present
              {totalGuards > 0 && (
                <span className="text-slate-400 ml-1">
                  ({Math.round((presentCount / totalGuards) * 100)}%)
                </span>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {log.attendance.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 px-6">No attendance records</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {log.attendance.map(att => {
                const cfg = ATTENDANCE_CONFIG[att.status] || ATTENDANCE_CONFIG.present;
                return (
                  <div key={att.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                        {att.employee_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{att.employee_name}</p>
                        {att.guard_no && <p className="text-xs text-slate-400">{att.guard_no}</p>}
                        {att.notes && <p className="text-xs text-slate-500 mt-0.5">{att.notes}</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incidents */}
      {log.incidents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Incidents ({log.incidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {log.incidents.map((inc, i) => {
              const sevCfg = SEVERITY_CONFIG[inc.severity] || SEVERITY_CONFIG.low;
              return (
                <div key={inc.id} className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {INCIDENT_TYPE_LABELS[inc.incident_type] || inc.incident_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${sevCfg.className}`}>
                      {sevCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{inc.description}</p>
                  {inc.reported_by && (
                    <p className="text-xs text-slate-400">Reported by: {inc.reported_by}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyLogDetailPage;

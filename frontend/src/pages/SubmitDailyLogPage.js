import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  ClipboardList,
  MapPin,
} from 'lucide-react';
import dailyLogService from '@/services/dailyLogService';
import siteService from '@/services/siteService';
import allocationService from '@/services/allocationService';

const SHIFTS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'night', label: 'Night' },
  { value: 'full_day', label: 'Full Day' },
];

const STATUSES = [
  { value: 'normal', label: 'Normal', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'incident', label: 'Incident', className: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'critical', label: 'Critical', className: 'border-red-300 bg-red-50 text-red-700' },
];

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'absent', label: 'Absent', className: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'late', label: 'Late', className: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'left_early', label: 'Left Early', className: 'bg-slate-100 text-slate-700 border-slate-300' },
];

const INCIDENT_TYPES = [
  { value: 'guard_absent', label: 'Guard Absent' },
  { value: 'theft', label: 'Theft / Robbery' },
  { value: 'complaint', label: 'Client Complaint' },
  { value: 'injury', label: 'Injury / Accident' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', className: 'border-slate-300 bg-slate-50 text-slate-600' },
  { value: 'medium', label: 'Medium', className: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'high', label: 'High', className: 'border-red-300 bg-red-50 text-red-700' },
];

const today = () => new Date().toISOString().slice(0, 10);

const StepIndicator = ({ current, steps }) => (
  <div className="flex items-center gap-2 mb-8">
    {steps.map((s, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          i < current
            ? 'bg-emerald-500 text-white'
            : i === current
            ? 'bg-[#0F172A] text-white'
            : 'bg-slate-100 text-slate-400'
        }`}>
          {i < current ? <Check className="w-4 h-4" /> : i + 1}
        </div>
        <span className={`text-sm font-medium hidden sm:block ${i === current ? 'text-slate-900' : 'text-slate-400'}`}>
          {s}
        </span>
        {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />}
      </div>
    ))}
  </div>
);

const emptyIncident = () => ({
  _key: Math.random(),
  incident_type: '',
  description: '',
  severity: 'low',
  reported_by: '',
});

const SubmitDailyLogPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [form, setForm] = useState({
    site_id: '',
    log_date: today(),
    shift: 'morning',
    overall_status: 'normal',
    notes: '',
  });

  // Step 2 state
  const [attendance, setAttendance] = useState([]);
  const [guardsLoaded, setGuardsLoaded] = useState(false);

  // Step 3 state
  const [incidents, setIncidents] = useState([]);

  const sitesQuery = useQuery({
    queryKey: ['sites', 'all'],
    queryFn: () => siteService.getAll(),
  });
  const sites = sitesQuery.data?.data || [];

  const guardsQuery = useQuery({
    queryKey: ['site-guards', form.site_id],
    queryFn: () => allocationService.getSiteGuards(form.site_id),
    enabled: !!form.site_id,
  });

  // When guards load, initialise attendance with all present
  useEffect(() => {
    if (guardsQuery.data && !guardsLoaded) {
      setAttendance(
        guardsQuery.data.map(g => ({
          employee_id: g.employee_id,
          employee_name: g.employee_name,
          guard_no: g.guard_no,
          status: 'present',
          notes: '',
        }))
      );
      setGuardsLoaded(true);
    }
  }, [guardsQuery.data, guardsLoaded]);

  // Reset guards when site changes
  useEffect(() => {
    setGuardsLoaded(false);
    setAttendance([]);
  }, [form.site_id]);

  const submitMutation = useMutation({
    mutationFn: (data) => dailyLogService.submit(data),
    onSuccess: (data) => {
      toast.success('Daily log submitted successfully');
      navigate(`/daily-logs/${data.id}`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit log');
    },
  });

  const handleSubmit = () => {
    const payload = {
      site_id: form.site_id,
      log_date: form.log_date,
      shift: form.shift,
      overall_status: form.overall_status,
      notes: form.notes || null,
      attendance: attendance.map(a => ({
        employee_id: a.employee_id,
        status: a.status,
        notes: a.notes || null,
      })),
      incidents: incidents
        .filter(i => i.incident_type && i.description)
        .map(i => ({
          incident_type: i.incident_type,
          description: i.description,
          severity: i.severity,
          reported_by: i.reported_by || null,
        })),
    };
    submitMutation.mutate(payload);
  };

  const setAttStatus = (idx, status) => {
    setAttendance(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], status };
      // Auto-suggest incident when marked absent
      if (status === 'absent') {
        const name = next[idx].employee_name;
        const alreadyHas = incidents.some(
          i => i.incident_type === 'guard_absent' && i.description.includes(name)
        );
        if (!alreadyHas) {
          setIncidents(prev2 => [...prev2, {
            ...emptyIncident(),
            incident_type: 'guard_absent',
            description: `${name} was absent during this shift`,
            severity: 'medium',
          }]);
        }
      }
      return next;
    });
  };

  const setAttNotes = (idx, notes) =>
    setAttendance(prev => { const n = [...prev]; n[idx] = { ...n[idx], notes }; return n; });

  const updateIncident = (idx, field, value) =>
    setIncidents(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });

  const removeIncident = (idx) =>
    setIncidents(prev => prev.filter((_, i) => i !== idx));

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;

  const canGoNext = () => {
    if (step === 0) return !!form.site_id && !!form.log_date;
    if (step === 1) return true;
    if (step === 2) return incidents.every(i => i.incident_type && i.description);
    return true;
  };

  const selectedSite = sites.find(s => s.id === form.site_id);

  const steps = ['Log Details', 'Attendance', 'Incidents', 'Review & Submit'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Submit Daily Log</h1>
        <p className="text-slate-500 text-sm mt-1">Record shift attendance and incidents</p>
      </div>

      <StepIndicator current={step} steps={steps} />

      {/* Step 0 — Log Details */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Site *</label>
              {sitesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading sites…
                </div>
              ) : (
                <Select value={form.site_id} onValueChange={v => setForm(p => ({ ...p, site_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.site_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Date *</label>
              <input
                type="date"
                value={form.log_date}
                onChange={e => setForm(p => ({ ...p, log_date: e.target.value }))}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Shift</label>
              <div className="flex gap-2 flex-wrap">
                {SHIFTS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, shift: s.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.shift === s.value
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Overall Status</label>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, overall_status: s.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.overall_status === s.value ? s.className : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Any general notes about this shift…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 — Attendance */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Attendance</CardTitle>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="text-emerald-600 font-medium">{presentCount} present</span>
                {absentCount > 0 && <span className="text-red-600 font-medium">{absentCount} absent</span>}
                {lateCount > 0 && <span className="text-amber-600 font-medium">{lateCount} late</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {guardsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading allocated guards…</span>
              </div>
            ) : attendance.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No guards allocated to this site</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 -mx-6 px-0">
                {attendance.map((att, idx) => (
                  <div key={att.employee_id} className="px-6 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0 mt-0.5">
                        {att.employee_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{att.employee_name}</p>
                        {att.guard_no && <p className="text-xs text-slate-400">{att.guard_no}</p>}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {ATTENDANCE_STATUSES.map(s => (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => setAttStatus(idx, s.value)}
                              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                                att.status === s.value ? s.className : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        {att.status !== 'present' && (
                          <input
                            type="text"
                            value={att.notes}
                            onChange={e => setAttNotes(idx, e.target.value)}
                            placeholder="Notes (optional)"
                            className="mt-2 w-full h-8 px-2.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Incidents */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Incidents</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncidents(prev => [...prev, emptyIncident()])}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Incident
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="py-10 text-center">
                <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No incidents — click "Add Incident" if something occurred</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incidents.map((inc, idx) => (
                  <div key={inc._key} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Incident {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeIncident(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Type *</label>
                        <Select value={inc.incident_type} onValueChange={v => updateIncident(idx, 'incident_type', v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {INCIDENT_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Severity</label>
                        <div className="flex gap-1.5">
                          {SEVERITIES.map(s => (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => updateIncident(idx, 'severity', s.value)}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                                inc.severity === s.value ? s.className : 'bg-white text-slate-400 border-slate-200'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Description *</label>
                      <textarea
                        value={inc.description}
                        onChange={e => updateIncident(idx, 'description', e.target.value)}
                        rows={2}
                        placeholder="Describe what happened…"
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Reported by</label>
                      <input
                        type="text"
                        value={inc.reported_by}
                        onChange={e => updateIncident(idx, 'reported_by', e.target.value)}
                        placeholder="Who told you about this?"
                        className="w-full h-8 px-2.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review & Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Log info */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-900">{selectedSite?.site_name || form.site_id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
                <div><span className="text-slate-400">Date: </span>{form.log_date}</div>
                <div><span className="text-slate-400">Shift: </span>{SHIFTS.find(s => s.value === form.shift)?.label}</div>
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className="capitalize">{form.overall_status}</span>
                </div>
              </div>
              {form.notes && <p className="text-sm text-slate-600 border-t border-slate-200 pt-2">{form.notes}</p>}
            </div>

            {/* Attendance summary */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Attendance — {attendance.length} guards
              </h3>
              <div className="flex gap-3 text-sm">
                <span className="text-emerald-600">{presentCount} present</span>
                {absentCount > 0 && <span className="text-red-600">{absentCount} absent</span>}
                {lateCount > 0 && <span className="text-amber-600">{lateCount} late</span>}
                {attendance.filter(a => a.status === 'left_early').length > 0 && (
                  <span className="text-slate-600">{attendance.filter(a => a.status === 'left_early').length} left early</span>
                )}
              </div>
              {attendance.filter(a => a.status !== 'present').map(a => (
                <div key={a.employee_id} className="mt-1.5 text-sm flex items-center gap-2">
                  <span className="text-slate-700">{a.employee_name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                    a.status === 'absent' ? 'bg-red-100 text-red-600' :
                    a.status === 'late' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                  }`}>{a.status.replace('_', ' ')}</span>
                  {a.notes && <span className="text-slate-400 text-xs">— {a.notes}</span>}
                </div>
              ))}
            </div>

            {/* Incidents summary */}
            {incidents.filter(i => i.incident_type && i.description).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Incidents — {incidents.filter(i => i.incident_type && i.description).length}
                </h3>
                {incidents.filter(i => i.incident_type && i.description).map((inc, i) => (
                  <div key={inc._key} className="text-sm flex items-start gap-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                      inc.severity === 'high' ? 'bg-red-100 text-red-600' :
                      inc.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>{inc.severity}</span>
                    <span className="text-slate-700">{INCIDENT_TYPES.find(t => t.value === inc.incident_type)?.label}: {inc.description}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate('/daily-logs')}>Cancel</Button>
        )}

        {step < 3 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canGoNext()}
            className="bg-[#0F172A] hover:bg-slate-800"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="bg-[#0F172A] hover:bg-slate-800 min-w-[120px]"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
            ) : (
              <><Check className="w-4 h-4 mr-2" />Submit Log</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SubmitDailyLogPage;

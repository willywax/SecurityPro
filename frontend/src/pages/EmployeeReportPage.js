import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
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
import { toast } from 'sonner';
import { Loader2, Download, Printer, Users, Filter, Columns, Eye } from 'lucide-react';
import reportService from '@/services/reportService';
import zoneService from '@/services/zoneService';
import regionService from '@/services/regionService';
import siteService from '@/services/siteService';
import clientService from '@/services/clientService';
import { useZoneScope } from '@/hooks/useZoneScope';

const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'rehired', label: 'Rehired' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'absconded', label: 'Absconded' },
  { value: 'on_leave', label: 'On Leave' },
];

const AVAILABILITY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'allocated', label: 'Allocated' },
];

const CONTRACT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'no_contract', label: 'No Contract' },
];

const EXPIRY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '7', label: 'Within 7 days' },
  { value: '30', label: 'Within 30 days' },
  { value: '60', label: 'Within 60 days' },
  { value: '90', label: 'Within 90 days' },
];

const FIELD_GROUPS = [
  { key: 'basic', label: 'Basic Info', desc: 'Name, Guard No, Phone, Email' },
  { key: 'employment', label: 'Employment Details', desc: 'Status, Hire Date, Zone, Region, Current Site' },
  { key: 'bank_details', label: 'Bank Details', desc: 'Bank, Branch, Account Name & Number' },
  { key: 'next_of_kin', label: 'Next of Kin', desc: 'Name, Relationship, Phone' },
  { key: 'references', label: 'References', desc: 'Name, Relationship, Phone' },
  { key: 'contract', label: 'Current Contract', desc: 'Type, Dates, Salary, Status' },
  { key: 'assets_issued', label: 'Assets Issued', desc: 'Item name, Quantity, Issue Date' },
  { key: 'phone_numbers', label: 'Phone Numbers Only', desc: 'Phone 1 and Phone 2 only' },
];

const THREE_WAY = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

// Flatten nested object to CSV-friendly columns
const flattenRow = (row) => {
  const flat = { ...row };
  if (Array.isArray(flat.assets_issued)) {
    flat.assets_issued = flat.assets_summary || '';
    delete flat.assets_summary;
  }
  return flat;
};

const convertToCSV = (rows) => {
  if (!rows.length) return '';
  const flat = rows.map(flattenRow);
  const skip = new Set(['id', 'assets_summary']);
  const headers = Object.keys(flat[0]).filter(k => !skip.has(k));
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  return [
    headers.map(escape).join(','),
    ...flat.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
};

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const MultiCheckList = ({ items, selected, onChange, keyField = 'id', labelField, maxH = '160px' }) => (
  <div className={`overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1`} style={{ maxHeight: maxH }}>
    {items.length === 0 ? (
      <p className="text-xs text-slate-400 px-1 py-2">No options available</p>
    ) : (
      items.map(item => {
        const val = item[keyField];
        const checked = selected.includes(val);
        return (
          <label key={val} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1.5 py-1">
            <Checkbox
              checked={checked}
              onCheckedChange={c => onChange(c ? [...selected, val] : selected.filter(v => v !== val))}
            />
            <span className="text-sm text-slate-700">{item[labelField]}</span>
          </label>
        );
      })
    )}
  </div>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-1.5 bg-slate-100 rounded">
      <Icon className="w-4 h-4 text-slate-600" />
    </div>
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
  </div>
);

const EmployeeReportPage = () => {
  const { isFullAccess } = useZoneScope();

  const [filters, setFilters] = useState({
    zone_ids: [],
    region_ids: [],
    site_ids: [],
    client_ids: [],
    employment_status: [],
    availability_status: [],
    contract_status: [],
    contract_expiry_within_days: '',
    has_assets_issued: '',
  });

  const [fields, setFields] = useState({
    basic: true,
    employment: true,
    bank_details: false,
    next_of_kin: false,
    references: false,
    contract: false,
    assets_issued: false,
    phone_numbers: false,
  });

  const [previewData, setPreviewData] = useState(null);

  // Zone filter loads regions
  const zonesQuery = useQuery({
    queryKey: ['zones', 'all'],
    queryFn: () => zoneService.getAll(),
  });
  const zones = zonesQuery.data || [];

  const regionsQuery = useQuery({
    queryKey: ['regions', 'report', filters.zone_ids],
    queryFn: () => regionService.getAll(
      filters.zone_ids.length === 1 ? { zone_id: filters.zone_ids[0] } : {}
    ),
  });
  const regions = regionsQuery.data || [];

  const sitesQuery = useQuery({
    queryKey: ['sites', 'report'],
    queryFn: () => siteService.getAll(),
  });
  const sites = sitesQuery.data?.data || [];

  const clientsQuery = useQuery({
    queryKey: ['clients', 'report'],
    queryFn: () => clientService.getAll(),
  });
  const clients = clientsQuery.data?.data || [];

  const buildBody = (preview) => ({
    preview,
    filters: {
      zone_ids: filters.zone_ids,
      region_ids: filters.region_ids,
      site_ids: filters.site_ids,
      client_ids: filters.client_ids,
      employment_status: filters.employment_status,
      availability_status: filters.availability_status,
      contract_status: filters.contract_status,
      contract_expiry_within_days: filters.contract_expiry_within_days
        ? parseInt(filters.contract_expiry_within_days)
        : null,
      has_assets_issued: filters.has_assets_issued === 'true'
        ? true
        : filters.has_assets_issued === 'false'
        ? false
        : null,
    },
    fields,
  });

  const previewMutation = useMutation({
    mutationFn: () => reportService.generateEmployeeReport(buildBody(true)),
    onSuccess: (data) => setPreviewData(data),
    onError: () => toast.error('Failed to generate preview'),
  });

  const exportMutation = useMutation({
    mutationFn: () => reportService.generateEmployeeReport(buildBody(false)),
    onSuccess: (data) => {
      const csv = convertToCSV(data.employees);
      if (!csv) { toast.error('No data to export'); return; }
      const filename = `employee_report_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csv, filename);
      toast.success(`Exported ${data.employees.length} records`);
    },
    onError: () => toast.error('Export failed'),
  });

  const setFilter = useCallback((key, val) => setFilters(p => ({ ...p, [key]: val })), []);
  const toggleFilter = useCallback((key, val) => setFilters(p => {
    const arr = p[key];
    return { ...p, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
  }), []);
  const toggleField = useCallback((key) => setFields(p => ({ ...p, [key]: !p[key] })), []);

  // Build preview table columns from first row
  const previewColumns = previewData?.employees?.length
    ? Object.keys(previewData.employees[0]).filter(k => k !== 'id' && k !== 'assets_summary' && !Array.isArray(previewData.employees[0][k]))
    : [];

  const formatColHeader = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Report Generator</h1>
        <p className="text-slate-500 text-sm mt-1">Filter employees and select fields to build a custom report</p>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-5">
          <SectionHeader icon={Filter} title="Filters" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zone */}
            {isFullAccess && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Zone</label>
                <MultiCheckList
                  items={zones}
                  selected={filters.zone_ids}
                  onChange={v => setFilter('zone_ids', v)}
                  labelField="zone_name"
                />
              </div>
            )}

            {/* Region */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Region</label>
              <MultiCheckList
                items={regions}
                selected={filters.region_ids}
                onChange={v => setFilter('region_ids', v)}
                labelField="region_name"
              />
            </div>

            {/* Site */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Site</label>
              <MultiCheckList
                items={sites}
                selected={filters.site_ids}
                onChange={v => setFilter('site_ids', v)}
                labelField="site_name"
              />
            </div>

            {/* Client */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Client</label>
              <MultiCheckList
                items={clients}
                selected={filters.client_ids}
                onChange={v => setFilter('client_ids', v)}
                labelField="client_name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Employment Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Employment Status</label>
              <div className="space-y-1.5">
                {EMPLOYMENT_STATUSES.map(s => (
                  <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.employment_status.includes(s.value)}
                      onCheckedChange={() => toggleFilter('employment_status', s.value)}
                    />
                    <span className="text-sm text-slate-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Availability</label>
              <div className="space-y-1.5">
                {AVAILABILITY_STATUSES.map(s => (
                  <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.availability_status.includes(s.value)}
                      onCheckedChange={() => toggleFilter('availability_status', s.value)}
                    />
                    <span className="text-sm text-slate-700">{s.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Contract Status</label>
                {CONTRACT_STATUSES.map(s => (
                  <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.contract_status.includes(s.value)}
                      onCheckedChange={() => toggleFilter('contract_status', s.value)}
                    />
                    <span className="text-sm text-slate-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contract expiry + assets */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Contract Expiring</label>
                <Select
                  value={filters.contract_expiry_within_days}
                  onValueChange={v => setFilter('contract_expiry_within_days', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Has Assets Issued</label>
                <div className="flex gap-2">
                  {THREE_WAY.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setFilter('has_assets_issued', o.value)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                        filters.has_assets_issued === o.value
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Fields ── */}
      <Card>
        <CardContent className="pt-5">
          <SectionHeader icon={Columns} title="Select Information to Include" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELD_GROUPS.map(fg => (
              <label
                key={fg.key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  fields[fg.key]
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Checkbox
                  checked={fields[fg.key]}
                  onCheckedChange={() => toggleField(fg.key)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{fg.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fg.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Preview & Export ── */}
      <Card>
        <CardContent className="pt-5">
          <SectionHeader icon={Eye} title="Preview & Export" />

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={previewMutation.isPending}
              className="bg-[#0F172A] hover:bg-slate-800"
            >
              {previewMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                : <><Eye className="w-4 h-4 mr-2" />Generate Preview</>
              }
            </Button>

            {previewData && (
              <>
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting…</>
                    : <><Download className="w-4 h-4 mr-2" />Export CSV</>
                  }
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </>
            )}
          </div>

          {previewData && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">
                  <strong>{previewData.total_count}</strong> employee{previewData.total_count !== 1 ? 's' : ''} match your filters
                  {previewData.is_preview && previewData.total_count > 10 && (
                    <span className="text-slate-400 ml-1">(showing first 10)</span>
                  )}
                </span>
              </div>

              {previewData.employees.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No employees match the selected filters.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        {previewColumns.map(col => (
                          <TableHead key={col} className="text-xs font-semibold whitespace-nowrap">
                            {formatColHeader(col)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.employees.map((row) => (
                        <TableRow key={row.id}>
                          {previewColumns.map(col => (
                            <TableCell key={col} className="text-sm whitespace-nowrap max-w-[200px] truncate">
                              {String(row[col] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeReportPage;

import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Check,
  ChevronsUpDown,
  X,
  FileText,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useZoneScope } from '@/hooks/useZoneScope';
import zoneService from '@/services/zoneService';
import regionService from '@/services/regionService';
import siteService from '@/services/siteService';
import clientService from '@/services/clientService';


// ─── Constants ────────────────────────────────────────────────────────────────

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'rehired', label: 'Rehired' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'absconded', label: 'Absconded' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'allocated', label: 'Allocated' },
];

const CONTRACT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'no_contract', label: 'No Contract' },
];

const EXPIRY_DAYS = [null, 7, 30, 60, 90];

const TRI_STATE = [
  { label: 'Any', v: null },
  { label: 'Yes', v: true },
  { label: 'No', v: false },
];

const FIELD_CONFIG = [
  { key: 'basic',        label: 'Basic Info',         desc: 'Name, guard no, phone, email',          defaultOn: true },
  { key: 'employment',   label: 'Employment Details',  desc: 'Status, hire date, zone, region, site', defaultOn: true },
  { key: 'bank_details', label: 'Bank Details',        desc: 'Bank, branch, account name & number',   defaultOn: false },
  { key: 'next_of_kin',  label: 'Next of Kin',         desc: 'Name, relationship, phone',             defaultOn: false },
  { key: 'references',   label: 'References',          desc: 'Referee name, relationship, phone',     defaultOn: false },
  { key: 'contract',     label: 'Current Contract',    desc: 'Type, dates, salary',                   defaultOn: false },
  { key: 'assets_issued',label: 'Assets Issued',       desc: 'Item name, quantity, issue date',       defaultOn: false },
  { key: 'phone_numbers',label: 'Phone Numbers Only',  desc: 'Primary & secondary phone',             defaultOn: false },
];

const DEFAULT_FIELDS = Object.fromEntries(FIELD_CONFIG.map((f) => [f.key, f.defaultOn]));

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Popover-based searchable multi-select with tag display. */
const MultiSelect = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);

  const toggle = (value) =>
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-9 font-normal text-sm"
          >
            {selected.length === 0 ? (
              <span className="text-slate-400">Select {label}…</span>
            ) : (
              <span className="text-slate-900">
                {selected.length} {label.toLowerCase()} selected
              </span>
            )}
            <ChevronsUpDown className="w-3.5 h-3.5 ml-2 text-slate-400 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} className="h-9" />
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border shrink-0',
                        selected.includes(opt.value)
                          ? 'bg-slate-900 border-slate-900'
                          : 'border-slate-300',
                      )}
                    >
                      {selected.includes(opt.value) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <Badge
                key={v}
                variant="secondary"
                className="gap-1 py-0 pr-1 text-xs font-normal"
              >
                {opt?.label || v}
                <button
                  type="button"
                  onClick={() => toggle(v)}
                  className="ml-0.5 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Inline checkbox row for status arrays. */
const CheckboxGroup = ({ options, selected, onChange }) => {
  const toggle = (value) =>
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
            className="h-4 w-4"
          />
          <span className="text-sm text-slate-700">{opt.label}</span>
        </label>
      ))}
    </div>
  );
};

/** Pill button group — value is compared by identity (handles null/bool). */
const PillGroup = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map(({ label, v }) => (
      <button
        key={label}
        type="button"
        onClick={() => onChange(v)}
        className={cn(
          'px-3 py-1 text-sm rounded-md border transition-colors',
          value === v
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400',
        )}
      >
        {label}
      </button>
    ))}
  </div>
);


// ─── Main Page ────────────────────────────────────────────────────────────────

const EmployeeReportPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isFullAccess } = useZoneScope();

  // Seed contract_expiry_within_days from ?contractExpiry= URL param
  const [filters, setFilters] = useState(() => {
    const expiry = searchParams.get('contractExpiry');
    return {
      zone_ids: [],
      region_ids: [],
      site_ids: [],
      client_ids: [],
      employment_status: [],
      availability_status: [],
      contract_status: [],
      contract_expiry_within_days: expiry ? parseInt(expiry, 10) : null,
      has_disciplinary: null,
      has_assets_issued: null,
    };
  });

  const [fields, setFields] = useState(DEFAULT_FIELDS);

  // ── Data for filter dropdowns ───────────────────────────────────────────────
  const zonesQuery = useQuery({
    queryKey: ['zones'],
    queryFn: () => zoneService.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionService.getAll(),
    staleTime: 5 * 60 * 1000,
  });
  const sitesQuery = useQuery({
    queryKey: ['sites', 'report'],
    queryFn: () => siteService.getAll({ page_size: 200, status_filter: 'active' }),
    staleTime: 5 * 60 * 1000,
  });
  const clientsQuery = useQuery({
    queryKey: ['clients', 'report'],
    queryFn: () => clientService.getAll({ page_size: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const allZones   = zonesQuery.data   || [];
  const allRegions = regionsQuery.data || [];
  const allSites   = sitesQuery.data?.data   || [];
  const allClients = clientsQuery.data?.data || [];

  // Cascade: regions filtered to selected zones
  const visibleRegions =
    filters.zone_ids.length > 0
      ? allRegions.filter((r) => filters.zone_ids.includes(String(r.zone_id)))
      : allRegions;

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const setFilter = useCallback((key, val) => {
    setFilters((p) => ({ ...p, [key]: val }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      zone_ids: [],
      region_ids: [],
      site_ids: [],
      client_ids: [],
      employment_status: [],
      availability_status: [],
      contract_status: [],
      contract_expiry_within_days: null,
      has_disciplinary: null,
      has_assets_issued: null,
    });
  }, []);

  const handleGenerate = () => {
    navigate('/reports/employees/results', { state: { filters, fields } });
  };

  const toggleField = useCallback(
    (key) => setFields((p) => ({ ...p, [key]: !p[key] })),
    [],
  );

  const activeFilterCount = [
    filters.zone_ids.length > 0,
    filters.region_ids.length > 0,
    filters.site_ids.length > 0,
    filters.client_ids.length > 0,
    filters.employment_status.length > 0,
    filters.availability_status.length > 0,
    filters.contract_status.length > 0,
    filters.contract_expiry_within_days !== null,
    filters.has_disciplinary !== null,
    filters.has_assets_issued !== null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl" data-testid="employee-report-page">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Employee Report Generator
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Select filters and fields, preview results, then export to CSV or print.
          </p>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-1 shrink-0">
            <Badge variant="secondary" className="text-xs font-normal gap-1">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* ── Step 1: Filters ─────────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
              1
            </span>
            Filter Employees By
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Zone / Region / Site / Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isFullAccess && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1.5">Zone</p>
                <MultiSelect
                  label="Zones"
                  options={allZones.map((z) => ({ value: String(z.id), label: z.zone_name }))}
                  selected={filters.zone_ids}
                  onChange={(v) => {
                    setFilters((p) => ({ ...p, zone_ids: v, region_ids: [] }));
                  }}
                />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1.5">
                Region
                {filters.zone_ids.length > 0 && (
                  <span className="ml-1 text-xs font-normal text-slate-400">(filtered by zone)</span>
                )}
              </p>
              <MultiSelect
                label="Regions"
                options={visibleRegions.map((r) => ({
                  value: String(r.id),
                  label: r.region_name,
                }))}
                selected={filters.region_ids}
                onChange={(v) => setFilter('region_ids', v)}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1.5">Client</p>
              <MultiSelect
                label="Clients"
                options={allClients.map((c) => ({ value: String(c.id), label: c.client_name }))}
                selected={filters.client_ids}
                onChange={(v) => setFilter('client_ids', v)}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1.5">Site</p>
              <MultiSelect
                label="Sites"
                options={allSites.map((s) => ({ value: String(s.id), label: s.site_name }))}
                selected={filters.site_ids}
                onChange={(v) => setFilter('site_ids', v)}
              />
            </div>
          </div>

          <Separator />

          {/* Status checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Employment Status</p>
              <CheckboxGroup
                options={EMPLOYMENT_STATUS_OPTIONS}
                selected={filters.employment_status}
                onChange={(v) => setFilter('employment_status', v)}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Availability</p>
              <CheckboxGroup
                options={AVAILABILITY_OPTIONS}
                selected={filters.availability_status}
                onChange={(v) => setFilter('availability_status', v)}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Contract Status</p>
              <CheckboxGroup
                options={CONTRACT_STATUS_OPTIONS}
                selected={filters.contract_status}
                onChange={(v) => setFilter('contract_status', v)}
              />
            </div>
          </div>

          <Separator />

          {/* Expiry + tri-state */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Contract Expiring Within</p>
              <PillGroup
                value={filters.contract_expiry_within_days}
                onChange={(v) => setFilter('contract_expiry_within_days', v)}
                options={EXPIRY_DAYS.map((d) => ({ label: d ? `${d} days` : 'Any', v: d }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Has Disciplinary Events</p>
                <PillGroup
                  value={filters.has_disciplinary}
                  onChange={(v) => setFilter('has_disciplinary', v)}
                  options={TRI_STATE}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Has Assets Issued</p>
                <PillGroup
                  value={filters.has_assets_issued}
                  onChange={(v) => setFilter('has_assets_issued', v)}
                  options={TRI_STATE}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 2: Fields ──────────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
              2
            </span>
            Select Information to Include
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIELD_CONFIG.map((f) => (
              <label
                key={f.key}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
                  fields[f.key]
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <Checkbox
                  checked={fields[f.key]}
                  onCheckedChange={() => toggleField(f.key)}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{f.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3: Generate ───────────────────────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
              3
            </span>
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerate}
              className="bg-[#0F172A] hover:bg-slate-800"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <p className="text-xs text-slate-400">
              Opens a full results page with export and print options.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeReportPage;

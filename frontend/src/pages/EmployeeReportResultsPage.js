import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Download, Printer, Users, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import reportService from '@/services/reportService';


// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  active:     'bg-emerald-100 text-emerald-700',
  inactive:   'bg-slate-100 text-slate-600',
  terminated: 'bg-red-100 text-red-700',
  on_leave:   'bg-amber-100 text-amber-700',
  resigned:   'bg-slate-100 text-slate-600',
  absconded:  'bg-orange-100 text-orange-700',
  rehired:    'bg-blue-100 text-blue-700',
};

const fmtHeader = (k) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const downloadCSV = (rows) => {
  if (!rows.length) return;
  const skip = new Set(['id', 'assets_issued']);
  const keys = Object.keys(rows[0]).filter((k) => !skip.has(k));
  const esc = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [
    keys.map((k) => esc(fmtHeader(k))).join(','),
    ...rows.map((r) => keys.map((k) => esc(r[k])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employee-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


// ─── Page ─────────────────────────────────────────────────────────────────────

const EmployeeReportResultsPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const filters = state?.filters;
  const fields  = state?.fields;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report', 'employees', 'full', filters, fields],
    queryFn: () => reportService.generateEmployeeReport({ filters, fields, preview: false }),
    enabled: !!filters,
    staleTime: 0,
  });

  if (!filters) {
    navigate('/reports/employees', { replace: true });
    return null;
  }

  const employees = data?.employees || [];
  const totalCount = data?.total_count ?? 0;
  const skipKeys = new Set(['id', 'assets_issued', 'assets_summary']);
  const cols = employees.length
    ? Object.keys(employees[0]).filter((k) => !skipKeys.has(k))
    : [];

  const handleExport = () => {
    if (!employees.length) { toast.error('No data to export'); return; }
    downloadCSV(employees);
    toast.success(`Exported ${employees.length} records`);
  };

  return (
    <div className="space-y-0">

      {/* ── Sticky toolbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports/employees')}
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Report
          </Button>

          <div className="h-5 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="text-sm text-slate-700">
                <strong>{totalCount}</strong>{' '}
                employee{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading || !employees.length}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={isLoading || !employees.length}
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Print header (hidden on screen) ───────────────────────────────── */}
      <div className="hidden print:block px-6 py-4">
        <h1 className="text-lg font-bold">Employee Report</h1>
        <p className="text-sm text-slate-500">
          Generated {new Date().toLocaleDateString()} · {totalCount} employee{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5">

        {isError && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Failed to load report. Please go back and try again.
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading report…
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        )}

        {!isLoading && !isError && employees.length === 0 && (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-sm text-slate-500">No employees match the selected filters.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/reports/employees')}
            >
              Adjust Filters
            </Button>
          </div>
        )}

        {!isLoading && !isError && employees.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  {cols.map((col) => (
                    <TableHead key={col} className="text-xs font-semibold whitespace-nowrap">
                      {fmtHeader(col)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((row) => (
                  <TableRow key={row.id}>
                    {cols.map((col) => (
                      <TableCell
                        key={col}
                        className="text-sm py-2 whitespace-nowrap max-w-[220px]"
                      >
                        {col === 'employment_status' ? (
                          <Badge
                            className={cn(
                              'text-xs font-normal capitalize',
                              STATUS_BADGE[row[col]] || 'bg-slate-100 text-slate-700',
                            )}
                          >
                            {(row[col] || '').replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="block truncate">
                            {row[col] != null && row[col] !== '' ? String(row[col]) : '—'}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeReportResultsPage;

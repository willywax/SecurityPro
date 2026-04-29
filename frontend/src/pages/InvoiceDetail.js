import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  ArrowLeft,
  Loader2,
  Save,
  Edit,
  Trash2,
  Printer,
  Send,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  X,
  Users,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

// ============ HELPERS ============

const statusConfig = {
  draft:   { label: 'Draft',   badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent:    { label: 'Sent',    badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid:    { label: 'Paid',    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  overdue: { label: 'Overdue', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const fmtTZS = (n) => `TZS ${Number(n || 0).toLocaleString('en-US')}`;

const fmtDate = (d) => {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const uid = () => Math.random().toString(36).substr(2, 9);
const calcAmount = (qty, rate) => (parseFloat(qty) || 0) * (parseFloat(rate) || 0);
const siteSub = (site) => site.rows.reduce((sum, r) => sum + calcAmount(r.quantity, r.rate), 0);

const newGuardRow = () => ({ _id: uid(), item_type: 'guard', description: 'Security Guards', quantity: '', rate: '' });
const newAssetRow = () => ({ _id: uid(), item_type: 'asset', description: '', quantity: '', rate: '' });

// Convert DB items back to editable rows
const dbItemsToRows = (items) =>
  (items || []).map(item => ({
    _id: uid(),
    item_type: item.item_type,
    description: item.description,
    quantity: item.quantity.toString(),
    rate: item.rate.toString(),
  }));


// ============ PRINT FUNCTION ============

const printInvoice = (invoice, org) => {
  const fmtPrint = (n) => `TZS ${Number(n || 0).toLocaleString('en-US')}`;
  const bank = org?.bank_details || {};

  const sitesHtml = (invoice.sites || []).map(site => {
    const rowsHtml = (site.items || []).map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">
          ${item.item_type === 'guard' ? '<span style="color:#1d4ed8">Guards</span>' : '<span style="color:#92400e">Asset</span>'}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;">${fmtPrint(item.rate)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right;font-weight:600;">${fmtPrint(item.amount)}</td>
      </tr>
    `).join('');

    return `
      <tr><td colspan="5" style="background:#f1f5f9;padding:10px 12px;font-weight:700;font-size:13px;border-top:2px solid #cbd5e1;">${site.site_name}</td></tr>
      ${rowsHtml}
      <tr>
        <td colspan="4" style="padding:8px 12px;font-weight:600;font-size:13px;text-align:right;background:#f8fafc;">Site Subtotal</td>
        <td style="padding:8px 12px;font-weight:700;font-size:13px;text-align:right;background:#f8fafc;">${fmtPrint(site.subtotal)}</td>
      </tr>
    `;
  }).join('');

  const bankHtml = bank.bank_name ? `
    <div style="margin-top:28px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px;">Payment Details</div>
      <div style="font-size:13px;line-height:1.8;color:#1e293b;">
        <b>Bank:</b> ${bank.bank_name}<br/>
        <b>Account Name:</b> ${bank.account_name}<br/>
        <b>Account Number:</b> ${bank.account_number}<br/>
        ${bank.branch ? `<b>Branch:</b> ${bank.branch}<br/>` : ''}
        ${bank.swift_code ? `<b>Swift Code:</b> ${bank.swift_code}` : ''}
      </div>
    </div>
  ` : '';

  const notesHtml = invoice.notes ? `
    <div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;font-size:13px;color:#78350f;">
      <b>Notes:</b> ${invoice.notes}
    </div>
  ` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoice_id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; color: #1e293b; background: white; padding: 40px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #0f172a;">
    <div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${org?.name || 'Lakezone Operation System'}</div>
      ${org?.address ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${org.address}</div>` : ''}
      ${org?.phone ? `<div style="font-size:12px;color:#64748b;">${org.phone}</div>` : ''}
      ${org?.email ? `<div style="font-size:12px;color:#64748b;">${org.email}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:2px;">INVOICE</div>
      <div style="font-size:18px;font-weight:700;color:#3b82f6;font-family:monospace;margin-top:4px;">${invoice.invoice_id}</div>
      <div style="font-size:12px;color:#64748b;margin-top:8px;">Issue Date: <b>${fmtDate(invoice.issue_date)}</b></div>
      <div style="font-size:12px;color:#64748b;">Due Date: <b>${fmtDate(invoice.due_date)}</b></div>
      <div style="margin-top:8px;">
        <span style="background:${invoice.status === 'paid' ? '#dcfce7' : invoice.status === 'overdue' ? '#fee2e2' : invoice.status === 'sent' ? '#dbeafe' : '#f1f5f9'};color:${invoice.status === 'paid' ? '#15803d' : invoice.status === 'overdue' ? '#dc2626' : invoice.status === 'sent' ? '#1d4ed8' : '#475569'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">
          ${invoice.status}
        </span>
      </div>
    </div>
  </div>

  <!-- Bill To -->
  <div style="margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px;">Bill To</div>
    <div style="font-size:16px;font-weight:700;color:#0f172a;">${invoice.client_name || ''}</div>
    ${invoice.client_address ? `<div style="font-size:13px;color:#64748b;margin-top:2px;">${invoice.client_address}</div>` : ''}
    ${invoice.client_email ? `<div style="font-size:13px;color:#64748b;">${invoice.client_email}</div>` : ''}
  </div>

  <!-- Items Table -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#0f172a;">
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Type</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Description</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Rate</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${sitesHtml}
    </tbody>
  </table>

  <!-- Grand Total -->
  <div style="margin-top:16px;text-align:right;">
    <div style="display:inline-block;background:#0f172a;color:white;padding:12px 24px;border-radius:8px;">
      <span style="font-size:14px;font-weight:500;margin-right:16px;">Grand Total</span>
      <span style="font-size:22px;font-weight:800;font-family:monospace;">${fmtPrint(invoice.grand_total)}</span>
    </div>
  </div>

  ${bankHtml}
  ${notesHtml}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
    Thank you for your business. Please make payment by ${fmtDate(invoice.due_date)}.
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
};


// ============ INVOICE VIEW (read mode) ============

const InvoiceView = ({ invoice }) => (
  <div className="space-y-4">
    {/* Site groups */}
    {(invoice.sites || []).map(site => (
      <Card key={site.id} className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            {site.site_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-xs">Type</TableHead>
                  <TableHead className="font-semibold text-xs">Description</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Qty</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Rate</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(site.items || []).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={item.item_type === 'guard'
                          ? 'bg-blue-100 text-blue-700 border-blue-200 text-xs'
                          : 'bg-amber-100 text-amber-700 border-amber-200 text-xs'}
                      >
                        {item.item_type === 'guard' ? (
                          <><Users className="w-3 h-3 mr-1" />Guard</>
                        ) : (
                          <><Shield className="w-3 h-3 mr-1" />Asset</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">{item.description}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{item.quantity}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmtTZS(item.rate)}</TableCell>
                    <TableCell className="text-sm text-right font-mono font-semibold">{fmtTZS(item.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right text-sm font-semibold text-slate-700 bg-slate-50">
                    Site Subtotal
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold font-mono bg-slate-50">
                    {fmtTZS(site.subtotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    ))}

    {/* Grand total */}
    <div className="flex justify-end">
      <div className="bg-slate-900 text-white rounded-xl px-6 py-4 flex items-center gap-6">
        <span className="text-sm font-medium">Grand Total</span>
        <span className="text-2xl font-bold font-mono" data-testid="grand-total-view">
          {fmtTZS(invoice.grand_total)}
        </span>
      </div>
    </div>
  </div>
);


// ============ EDIT SITES FORM ============

const EditSitesForm = ({ invoice, api, onSaved, onCancel }) => {
  const [sites, setSites] = useState(
    (invoice.sites || []).map(s => ({
      site_id: s.site_id,
      site_name: s.site_name,
      rows: dbItemsToRows(s.items),
    }))
  );
  const [form, setForm] = useState({
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    notes: invoice.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const grandTotal = sites.reduce((sum, s) => sum + siteSub(s), 0);

  const addRow = (si, rowType) => {
    setSites(prev => prev.map((s, i) =>
      i === si ? { ...s, rows: [...s.rows, rowType === 'guard' ? newGuardRow() : newAssetRow()] } : s
    ));
  };

  const removeRow = (si, ri) => {
    setSites(prev => prev.map((s, i) =>
      i === si ? { ...s, rows: s.rows.filter((_, rj) => rj !== ri) } : s
    ));
  };

  const updateRow = (si, ri, field, value) => {
    setSites(prev => prev.map((s, i) =>
      i === si ? { ...s, rows: s.rows.map((r, rj) => rj === ri ? { ...r, [field]: value } : r) } : s
    ));
  };

  const removeSite = (si) => setSites(prev => prev.filter((_, i) => i !== si));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        issue_date: form.issue_date,
        due_date: form.due_date,
        notes: form.notes || null,
        sites: sites.map(s => ({
          site_id: s.site_id,
          site_name: s.site_name,
          items: s.rows
            .filter(r => r.description && parseFloat(r.quantity) > 0 && parseFloat(r.rate) > 0)
            .map(r => ({
              item_type: r.item_type,
              description: r.description,
              quantity: parseFloat(r.quantity),
              rate: parseFloat(r.rate),
            })),
        })),
      };
      const r = await api.put(`/invoices/${invoice.id}`, payload);
      toast.success('Invoice updated');
      onSaved(r.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dates */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={form.issue_date}
                onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                data-testid="input-edit-issue-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                data-testid="input-edit-due-date"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                data-testid="input-edit-notes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sites */}
      {sites.map((site, si) => (
        <Card key={site.site_id} className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{site.site_name}</CardTitle>
              <button
                onClick={() => removeSite(si)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {site.rows.length > 0 && (
              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs w-20">Type</TableHead>
                      <TableHead className="text-xs min-w-[160px]">Description</TableHead>
                      <TableHead className="text-xs w-20">Qty</TableHead>
                      <TableHead className="text-xs w-32">Rate (TZS)</TableHead>
                      <TableHead className="text-xs w-32 text-right">Amount</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {site.rows.map((row, ri) => (
                      <TableRow key={row._id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={row.item_type === 'guard'
                              ? 'bg-blue-100 text-blue-700 border-blue-200 text-xs cursor-pointer'
                              : 'bg-amber-100 text-amber-700 border-amber-200 text-xs cursor-pointer'}
                            onClick={() => updateRow(si, ri, 'item_type', row.item_type === 'guard' ? 'asset' : 'guard')}
                          >
                            {row.item_type === 'guard' ? 'Guard' : 'Asset'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.description}
                            onChange={e => updateRow(si, ri, 'description', e.target.value)}
                            className="h-7 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min="0" value={row.quantity}
                            onChange={e => updateRow(si, ri, 'quantity', e.target.value)}
                            className="h-7 text-sm w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min="0" value={row.rate}
                            onChange={e => updateRow(si, ri, 'rate', e.target.value)}
                            className="h-7 text-sm w-28"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {fmtTZS(calcAmount(row.quantity, row.rate))}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => removeRow(si, ri)} className="p-1 text-slate-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addRow(si, 'guard')}
                  className="text-blue-700 border-blue-200 hover:bg-blue-50 h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Guard Row
                </Button>
                <Button variant="outline" size="sm" onClick={() => addRow(si, 'asset')}
                  className="text-amber-700 border-amber-200 hover:bg-amber-50 h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />Asset Row
                </Button>
              </div>
              <span className="text-sm font-semibold">
                Subtotal: <span className="font-mono">{fmtTZS(siteSub(site))}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Grand total + save */}
      <div className="bg-slate-900 text-white rounded-xl px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-medium">Grand Total</span>
        <span className="text-2xl font-bold font-mono">{fmtTZS(grandTotal)}</span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save-edit">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </Button>
      </div>
    </div>
  );
};


// ============ BANK DETAILS CARD ============

const BankDetailsCard = ({ bankDetails }) => {
  if (!bankDetails?.bank_name) return null;
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {[
            ['Bank', bankDetails.bank_name],
            ['Account Name', bankDetails.account_name],
            ['Account Number', bankDetails.account_number],
            ['Branch', bankDetails.branch],
            ['Swift Code', bankDetails.swift_code],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-sm font-medium text-slate-900 font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
};


// ============ MAIN PAGE ============

const InvoiceDetail = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [invRes, orgRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get('/organization'),
      ]);
      setInvoice(invRes.data);
      setOrg(orgRes.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Invoice not found');
        navigate('/invoices');
      } else {
        toast.error('Failed to load invoice');
      }
    } finally {
      setLoading(false);
    }
  }, [id, api, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (newStatus) => {
    try {
      const r = await api.put(`/invoices/${id}/status`, { status: newStatus });
      setInvoice(r.data);
      toast.success(`Invoice marked as ${newStatus}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Invoice deleted');
      navigate('/invoices');
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to delete invoice');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="invoice-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {invoice?.invoice_id}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm font-medium text-slate-700">{invoice?.client_name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm text-slate-500">
                  {fmtDate(invoice?.issue_date)} → {fmtDate(invoice?.due_date)}
                </span>
                <Badge variant="outline" className={statusConfig[invoice?.status]?.badge}>
                  {statusConfig[invoice?.status]?.label || invoice?.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center gap-2 flex-wrap pl-16 sm:pl-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => printInvoice(invoice, org)}
              data-testid="btn-print"
            >
              <Printer className="w-4 h-4 mr-2" />Print / Download
            </Button>

            {invoice?.status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => handleStatusChange('sent')}
                  data-testid="btn-mark-sent"
                >
                  <Send className="w-4 h-4 mr-2" />Mark Sent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="btn-edit"
                >
                  <Edit className="w-4 h-4 mr-2" />Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid="btn-delete"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete invoice {invoice?.invoice_id} for {invoice?.client_name}? This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="btn-confirm-delete">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {invoice?.status === 'sent' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => handleStatusChange('paid')}
                  data-testid="btn-mark-paid"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />Mark Paid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => handleStatusChange('overdue')}
                  data-testid="btn-mark-overdue"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />Mark Overdue
                </Button>
              </>
            )}

            {invoice?.status === 'overdue' && (
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleStatusChange('paid')}
                data-testid="btn-mark-paid-overdue"
              >
                <CheckCircle className="w-4 h-4 mr-2" />Mark Paid
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Client info strip */}
      {!isEditing && invoice?.client_address && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-500">Bill To:</span>
              <span className="font-medium text-slate-900">{invoice?.client_name}</span>
              {invoice?.client_address && <span className="text-slate-600">{invoice.client_address}</span>}
              {invoice?.client_email && <span className="text-slate-600">{invoice.client_email}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {!isEditing && invoice?.notes && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span className="font-medium">Notes: </span>{invoice.notes}
        </div>
      )}

      {/* Main content */}
      {isEditing ? (
        <EditSitesForm
          invoice={invoice}
          api={api}
          onSaved={(updated) => { setInvoice(updated); setIsEditing(false); }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <InvoiceView invoice={invoice} />
          <BankDetailsCard bankDetails={org?.bank_details} />
        </>
      )}
    </div>
  );
};

export default InvoiceDetail;

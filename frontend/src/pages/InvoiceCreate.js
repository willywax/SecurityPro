import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  Plus,
  X,
  Users,
  Shield,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const todayStr = () => new Date().toISOString().split('T')[0];
const uid = () => Math.random().toString(36).substr(2, 9);

const fmtTZS = (n) => `TZS ${Number(n || 0).toLocaleString('en-US')}`;

const calcAmount = (qty, rate) =>
  (parseFloat(qty) || 0) * (parseFloat(rate) || 0);

const siteSub = (site) =>
  site.rows.reduce((sum, row) => sum + calcAmount(row.quantity, row.rate), 0);

const newGuardRow = () => ({
  _id: uid(),
  item_type: 'guard',
  description: 'Security Guards',
  quantity: '',
  rate: '',
});

const newAssetRow = () => ({
  _id: uid(),
  item_type: 'asset',
  description: '',
  quantity: '',
  rate: '',
});

// ============ SITE CARD ============

const SiteCard = ({ site, siteIndex, onRemoveSite, onUpdateRow, onRemoveRow, onAddRow }) => {
  const subtotal = siteSub(site);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <CardTitle className="text-base">{site.site_name}</CardTitle>
          </div>
          <button
            onClick={() => onRemoveSite(siteIndex)}
            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded"
            data-testid={`btn-remove-site-${siteIndex}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Line items table */}
        {site.rows.length > 0 && (
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-xs w-24">Type</TableHead>
                  <TableHead className="font-semibold text-xs min-w-[180px]">Description</TableHead>
                  <TableHead className="font-semibold text-xs w-24">Quantity</TableHead>
                  <TableHead className="font-semibold text-xs w-36">Rate (TZS)</TableHead>
                  <TableHead className="font-semibold text-xs w-36 text-right">Amount</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {site.rows.map((row, rowIndex) => (
                  <TableRow key={row._id} data-testid={`row-${siteIndex}-${rowIndex}`}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={row.item_type === 'guard'
                          ? 'bg-blue-100 text-blue-700 border-blue-200 text-xs'
                          : 'bg-amber-100 text-amber-700 border-amber-200 text-xs'}
                      >
                        {row.item_type === 'guard' ? (
                          <><Users className="w-3 h-3 mr-1" />Guard</>
                        ) : (
                          <><Shield className="w-3 h-3 mr-1" />Asset</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.description}
                        onChange={e => onUpdateRow(siteIndex, rowIndex, 'description', e.target.value)}
                        placeholder={row.item_type === 'guard' ? 'Security Guards' : 'e.g. Guns, Radios...'}
                        className="h-8 text-sm"
                        data-testid={`input-desc-${siteIndex}-${rowIndex}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={row.quantity}
                        onChange={e => onUpdateRow(siteIndex, rowIndex, 'quantity', e.target.value)}
                        placeholder="0"
                        className="h-8 text-sm w-20"
                        data-testid={`input-qty-${siteIndex}-${rowIndex}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={row.rate}
                        onChange={e => onUpdateRow(siteIndex, rowIndex, 'rate', e.target.value)}
                        placeholder="0"
                        className="h-8 text-sm w-32"
                        data-testid={`input-rate-${siteIndex}-${rowIndex}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono text-slate-900">
                        {fmtTZS(calcAmount(row.quantity, row.rate))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => onRemoveRow(siteIndex, rowIndex)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        data-testid={`btn-remove-row-${siteIndex}-${rowIndex}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add row buttons + subtotal */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddRow(siteIndex, 'guard')}
              className="text-blue-700 border-blue-200 hover:bg-blue-50 h-8 text-xs"
              data-testid={`btn-add-guard-${siteIndex}`}
            >
              <Users className="w-3 h-3 mr-1" />Add Guard Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddRow(siteIndex, 'asset')}
              className="text-amber-700 border-amber-200 hover:bg-amber-50 h-8 text-xs"
              data-testid={`btn-add-asset-${siteIndex}`}
            >
              <Shield className="w-3 h-3 mr-1" />Add Asset Row
            </Button>
          </div>
          <div className="text-sm font-semibold text-slate-900">
            Site Subtotal: <span className="font-mono">{fmtTZS(subtotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============ MAIN FORM ============

const InvoiceCreate = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    client_id: '',
    issue_date: todayStr(),
    due_date: '',
    status: 'draft',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/clients?page_size=100').then(r => setClients(r.data.clients || [])).catch(() => {});
  }, [api]);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleClientChange = async (clientId) => {
    setField('client_id', clientId);
    setSites([]);
    if (!clientId) return;

    setLoadingSites(true);
    try {
      const r = await api.get(`/sites?client_id=${clientId}&page_size=100&status=active`);
      const loadedSites = r.data.sites || [];
      setSites(loadedSites.map(s => ({
        site_id: s.id,
        site_name: s.site_name,
        rows: [newGuardRow()],
      })));
    } catch {
      toast.error('Failed to load sites for this client');
    } finally {
      setLoadingSites(false);
    }
  };

  const addRow = (siteIndex, rowType) => {
    setSites(prev => prev.map((s, i) =>
      i === siteIndex
        ? { ...s, rows: [...s.rows, rowType === 'guard' ? newGuardRow() : newAssetRow()] }
        : s
    ));
  };

  const removeRow = (siteIndex, rowIndex) => {
    setSites(prev => prev.map((s, i) =>
      i === siteIndex
        ? { ...s, rows: s.rows.filter((_, ri) => ri !== rowIndex) }
        : s
    ));
  };

  const updateRow = (siteIndex, rowIndex, field, value) => {
    setSites(prev => prev.map((s, i) =>
      i === siteIndex
        ? { ...s, rows: s.rows.map((r, ri) => ri === rowIndex ? { ...r, [field]: value } : r) }
        : s
    ));
  };

  const removeSite = (siteIndex) => {
    setSites(prev => prev.filter((_, i) => i !== siteIndex));
  };

  const grandTotal = sites.reduce((sum, s) => sum + siteSub(s), 0);

  const validate = () => {
    const e = {};
    if (!form.client_id) e.client_id = 'Select a client';
    if (!form.issue_date) e.issue_date = 'Issue date is required';
    if (!form.due_date) e.due_date = 'Due date is required';
    if (sites.length === 0) e.sites = 'Add at least one site';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        issue_date: form.issue_date,
        due_date: form.due_date,
        status: form.status,
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

      const r = await api.post('/invoices', payload);
      toast.success(`Invoice ${r.data.invoice_id} created`);
      navigate(`/invoices/${r.data.id}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="invoice-create-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/invoices">
          <Button variant="ghost" size="icon" data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Invoice</h1>
          <p className="text-slate-500 text-sm mt-1">Create an invoice for a client</p>
        </div>
      </div>

      {/* Invoice Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger
                  className={errors.client_id ? 'border-red-500' : ''}
                  data-testid="select-client"
                >
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
            </div>

            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Input
                type="date"
                value={form.issue_date}
                onChange={e => setField('issue_date', e.target.value)}
                className={errors.issue_date ? 'border-red-500' : ''}
                data-testid="input-issue-date"
              />
              {errors.issue_date && <p className="text-sm text-red-500">{errors.issue_date}</p>}
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => setField('due_date', e.target.value)}
                className={errors.due_date ? 'border-red-500' : ''}
                data-testid="input-due-date"
              />
              {errors.due_date && <p className="text-sm text-red-500">{errors.due_date}</p>}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Optional notes or payment instructions"
                data-testid="input-notes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sites Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Line Items by Site</h2>
          {errors.sites && <p className="text-sm text-red-500">{errors.sites}</p>}
        </div>

        {!form.client_id ? (
          <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Select a client above to load their sites</p>
          </div>
        ) : loadingSites ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
            <span className="text-sm text-slate-500">Loading sites...</span>
          </div>
        ) : sites.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-lg">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No active sites found for this client</p>
          </div>
        ) : (
          sites.map((site, siteIndex) => (
            <SiteCard
              key={site.site_id}
              site={site}
              siteIndex={siteIndex}
              onRemoveSite={removeSite}
              onUpdateRow={updateRow}
              onRemoveRow={removeRow}
              onAddRow={addRow}
            />
          ))
        )}
      </div>

      {/* Grand Total + Save */}
      {sites.length > 0 && (
        <Card className="border-slate-900 bg-slate-900">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Grand Total</span>
              <span
                className="text-2xl font-bold text-white font-mono"
                data-testid="grand-total-display"
              >
                {fmtTZS(grandTotal)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Link to="/invoices">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0F172A] hover:bg-slate-800"
          data-testid="btn-save-invoice"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            : <><Save className="w-4 h-4 mr-2" />Save Invoice</>}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceCreate;

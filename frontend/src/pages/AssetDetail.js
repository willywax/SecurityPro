import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
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
import { Checkbox } from '../components/ui/checkbox';
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
  Trash2,
  Edit,
  Shield,
  Package,
  Wifi,
  Lock,
  Zap,
  Box,
  Minus,
  RotateCcw,
  Plus,
  User,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import EmployeeAutocomplete from '@/components/EmployeeAutocomplete';

// ============ CONFIG MAPS ============

const typeConfig = {
  gun:      { label: 'Gun',      Icon: Shield,  bg: 'bg-red-100',    text: 'text-red-600',    badge: 'bg-red-100 text-red-700 border-red-200' },
  uniform:  { label: 'Uniform',  Icon: Package, bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
  radio:    { label: 'Radio',    Icon: Wifi,    bg: 'bg-blue-100',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  baton:    { label: 'Baton',    Icon: Minus,   bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  handcuff: { label: 'Handcuff', Icon: Lock,    bg: 'bg-slate-100',  text: 'text-slate-600',  badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  torch:    { label: 'Torch',    Icon: Zap,     bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  other:    { label: 'Other',    Icon: Box,     bg: 'bg-teal-100',   text: 'text-teal-600',   badge: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const statusConfig = {
  available:   { label: 'Available',   badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  issued:      { label: 'Issued',      badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  lost:        { label: 'Lost',        badge: 'bg-red-100 text-red-700 border-red-200' },
  maintenance: { label: 'Maintenance', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  retired:     { label: 'Retired',     badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const conditionConfig = {
  new:  { label: 'New',  badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  good: { label: 'Good', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  fair: { label: 'Fair', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  poor: { label: 'Poor', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ============ DETAILS TAB ============

const emptyAssetForm = {
  asset_tag: '', asset_type: 'other', name: '', serial_number: '',
  status: 'available', condition: 'good', purchase_date: '', notes: '',
};

const DetailsTab = ({ asset, isCreate, onSaved, onDeleted, api, assetId }) => {
  const [isEditing, setIsEditing] = useState(isCreate);
  const [formData, setFormData] = useState(isCreate ? emptyAssetForm : asset || emptyAssetForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (asset && !isCreate) {
      setFormData(asset);
      setIsEditing(false);
    }
  }, [asset, isCreate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Asset name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...formData };
      ['asset_tag', 'serial_number', 'notes'].forEach(f => {
        if (!payload[f]) payload[f] = null;
      });
      if (!payload.purchase_date) delete payload.purchase_date;

      if (isCreate) {
        const response = await api.post('/assets', payload);
        toast.success('Asset created');
        onSaved(response.data, true);
      } else {
        const response = await api.put(`/assets/${assetId}`, payload);
        toast.success('Asset updated');
        setIsEditing(false);
        onSaved(response.data, false);
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Asset Information</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              if (isCreate) return;
              setFormData(asset);
              setErrors({});
              setIsEditing(false);
            }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Asset' : 'Save Changes'}</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Asset Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Glock 17 Pistol"
                className={errors.name ? 'border-red-500' : ''}
                data-testid="input-asset-name"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Select value={formData.asset_type} onValueChange={(v) => handleChange('asset_type', v)}>
                <SelectTrigger data-testid="select-asset-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Asset Tag</Label>
              <Input
                value={formData.asset_tag || ''}
                onChange={(e) => handleChange('asset_tag', e.target.value)}
                placeholder="e.g., TAG-001"
                data-testid="input-asset-tag"
              />
            </div>

            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.serial_number || ''}
                onChange={(e) => handleChange('serial_number', e.target.value)}
                placeholder="Manufacturer serial"
                data-testid="input-serial-number"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger data-testid="select-asset-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => handleChange('condition', v)}>
                <SelectTrigger data-testid="select-asset-condition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(conditionConfig).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={formData.purchase_date || ''}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
                data-testid="input-purchase-date"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Asset Information</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="btn-edit">
            <Edit className="w-4 h-4 mr-2" />Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="btn-delete">
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete {asset?.name}? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleted} className="bg-red-600 hover:bg-red-700" data-testid="btn-confirm-delete">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div><dt className="text-sm font-medium text-slate-500">Asset Name</dt><dd className="mt-1 text-sm text-slate-900 font-medium">{asset?.name}</dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Asset Type</dt><dd className="mt-1"><Badge variant="outline" className={typeConfig[asset?.asset_type]?.badge}>{typeConfig[asset?.asset_type]?.label || asset?.asset_type}</Badge></dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Asset Tag</dt><dd className="mt-1 text-sm text-slate-900 font-mono">{asset?.asset_tag || '-'}</dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Serial Number</dt><dd className="mt-1 text-sm text-slate-900 font-mono">{asset?.serial_number || '-'}</dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd className="mt-1"><Badge variant="outline" className={statusConfig[asset?.status]?.badge}>{statusConfig[asset?.status]?.label || asset?.status}</Badge></dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Condition</dt><dd className="mt-1"><Badge variant="outline" className={conditionConfig[asset?.condition]?.badge}>{conditionConfig[asset?.condition]?.label || asset?.condition}</Badge></dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Purchase Date</dt><dd className="mt-1 text-sm text-slate-900">{asset?.purchase_date || '-'}</dd></div>
          {asset?.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-sm font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 text-sm text-slate-900">{asset.notes}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
};


// ============ ISSUANCES TAB ============

const emptyIssueForm = {
  recipient_type: 'employee',
  issued_to_employee: '',
  issued_to_site: '',
  issue_date: todayStr(),
  issue_condition: 'good',
  remarks: '',
};

const emptyReturnForm = {
  return_date: todayStr(),
  return_condition: 'good',
  lost: false,
  remarks: '',
};

const IssuancesTab = ({ assetId, assetStatus, onAssetStatusChange, api }) => {
  const [issuances, setIssuances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);

  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [issueSaving, setIssueSaving] = useState(false);

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returningIssuance, setReturningIssuance] = useState(null);
  const [returnForm, setReturnForm] = useState(emptyReturnForm);
  const [returnSaving, setReturnSaving] = useState(false);

  const fetchIssuances = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/assets/${assetId}/issuances`);
      setIssuances(response.data);
    } catch (error) {
      console.error('Failed to fetch issuances:', error);
    } finally {
      setLoading(false);
    }
  }, [api, assetId]);

  useEffect(() => { fetchIssuances(); }, [fetchIssuances]);

  // Load employees and sites for dropdowns
  useEffect(() => {
    api.get('/employees?page_size=100').then(r => setEmployees(r.data.employees || [])).catch(console.error);
    api.get('/sites?page_size=100').then(r => setSites(r.data.sites || [])).catch(console.error);
  }, [api]);

  const openIssueDialog = () => {
    setIssueForm(emptyIssueForm);
    setIssueDialogOpen(true);
  };

  const handleIssue = async () => {
    if (!issueForm.issue_date || !issueForm.issue_condition) {
      toast.error('Please fill all required fields');
      return;
    }
    if (issueForm.recipient_type === 'employee' && !issueForm.issued_to_employee) {
      toast.error('Please select an employee');
      return;
    }
    if (issueForm.recipient_type === 'site' && !issueForm.issued_to_site) {
      toast.error('Please select a site');
      return;
    }

    setIssueSaving(true);
    try {
      const payload = {
        issue_date: issueForm.issue_date,
        issue_condition: issueForm.issue_condition,
        remarks: issueForm.remarks || null,
      };
      if (issueForm.recipient_type === 'employee') {
        payload.issued_to_employee = issueForm.issued_to_employee;
      } else {
        payload.issued_to_site = issueForm.issued_to_site;
      }

      await api.post(`/assets/${assetId}/issue`, payload);
      toast.success('Asset issued successfully');
      setIssueDialogOpen(false);
      fetchIssuances();
      onAssetStatusChange('issued');
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to issue asset');
    } finally {
      setIssueSaving(false);
    }
  };

  const openReturnDialog = (issuance) => {
    setReturningIssuance(issuance);
    setReturnForm(emptyReturnForm);
    setReturnDialogOpen(true);
  };

  const handleReturn = async () => {
    if (!returnForm.return_date) {
      toast.error('Return date is required');
      return;
    }
    setReturnSaving(true);
    try {
      const payload = {
        return_date: returnForm.return_date,
        lost: returnForm.lost,
        remarks: returnForm.remarks || null,
      };
      if (returnForm.return_condition) payload.return_condition = returnForm.return_condition;

      await api.put(`/assets/issuances/${returningIssuance.id}/return`, payload);
      toast.success(returnForm.lost ? 'Asset marked as lost' : 'Asset returned successfully');
      setReturnDialogOpen(false);
      fetchIssuances();
      onAssetStatusChange(returnForm.lost ? 'lost' : 'available');
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to process return');
    } finally {
      setReturnSaving(false);
    }
  };

  const activeIssuance = issuances.find(i => i.is_active);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-700">
          Issuance History
          {issuances.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">({issuances.length})</span>
          )}
        </h3>
        {assetStatus === 'available' && (
          <Button
            onClick={openIssueDialog}
            className="bg-[#0F172A] hover:bg-slate-800"
            data-testid="btn-issue-asset"
          >
            <Plus className="w-4 h-4 mr-2" />Issue Asset
          </Button>
        )}
      </div>

      {/* Active issuance banner */}
      {activeIssuance && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              {activeIssuance.issued_to_employee ? (
                <User className="w-4 h-4 text-blue-600" />
              ) : (
                <MapPin className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Currently issued to{' '}
                <span className="font-semibold">
                  {activeIssuance.employee_name || activeIssuance.site_name || 'Unknown'}
                </span>
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Since {activeIssuance.issue_date} · Condition: {conditionConfig[activeIssuance.issue_condition]?.label}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openReturnDialog(activeIssuance)}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 flex-shrink-0"
            data-testid="btn-return-asset"
          >
            <RotateCcw className="w-4 h-4 mr-2" />Return
          </Button>
        </div>
      )}

      {/* Issuances table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : issuances.length === 0 ? (
        <div className="py-10 text-center text-slate-500">
          <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm">No issuances yet for this asset.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Issued To</TableHead>
                <TableHead className="font-semibold">Issue Date</TableHead>
                <TableHead className="font-semibold">Condition</TableHead>
                <TableHead className="font-semibold">Returned</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuances.map((iso) => (
                <TableRow key={iso.id} data-testid={`issuance-row-${iso.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {iso.issued_to_employee ? (
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-slate-900">
                        {iso.employee_name || iso.site_name || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{iso.issue_date}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={conditionConfig[iso.issue_condition]?.badge}>
                      {conditionConfig[iso.issue_condition]?.label || iso.issue_condition}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{iso.return_date || '-'}</span>
                  </TableCell>
                  <TableCell>
                    {iso.is_active ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Active</Badge>
                    ) : iso.lost ? (
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Lost</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Returned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {iso.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReturnDialog(iso)}
                        className="text-slate-600 hover:text-slate-900"
                        data-testid={`btn-return-${iso.id}`}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Issue Asset Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Asset</DialogTitle>
            <DialogDescription>Assign this asset to an employee or a site</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Recipient type toggle */}
            <div className="space-y-2">
              <Label>Issue To</Label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${issueForm.recipient_type === 'employee' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setIssueForm(f => ({ ...f, recipient_type: 'employee', issued_to_site: '' }))}
                  data-testid="btn-issue-to-employee"
                >
                  <User className="w-4 h-4" />Employee
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${issueForm.recipient_type === 'site' ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setIssueForm(f => ({ ...f, recipient_type: 'site', issued_to_employee: '' }))}
                  data-testid="btn-issue-to-site"
                >
                  <MapPin className="w-4 h-4" />Site
                </button>
              </div>
            </div>

            {issueForm.recipient_type === 'employee' ? (
              <div className="space-y-2">
                <Label>Select Employee *</Label>
                <EmployeeAutocomplete
                  employees={employees}
                  value={issueForm.issued_to_employee}
                  onValueChange={(v) => setIssueForm(f => ({ ...f, issued_to_employee: v }))}
                  placeholder="Choose employee..."
                  emptyText="No employees found."
                  testId="select-issued-to-employee"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Site *</Label>
                <Select
                  value={issueForm.issued_to_site}
                  onValueChange={(v) => setIssueForm(f => ({ ...f, issued_to_site: v }))}
                >
                  <SelectTrigger data-testid="select-issued-to-site">
                    <SelectValue placeholder="Choose site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.site_name} ({s.site_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={issueForm.issue_date}
                  onChange={(e) => setIssueForm(f => ({ ...f, issue_date: e.target.value }))}
                  data-testid="input-issue-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Condition *</Label>
                <Select
                  value={issueForm.issue_condition}
                  onValueChange={(v) => setIssueForm(f => ({ ...f, issue_condition: v }))}
                >
                  <SelectTrigger data-testid="select-issue-condition"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionConfig).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={issueForm.remarks}
                onChange={(e) => setIssueForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleIssue}
                disabled={issueSaving}
                className="bg-[#0F172A] hover:bg-slate-800"
                data-testid="btn-confirm-issue"
              >
                {issueSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Issuing...</> : 'Issue Asset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>
              Record the return of this asset
              {returningIssuance && (
                <span className="font-medium text-slate-700">
                  {' '}from {returningIssuance.employee_name || returningIssuance.site_name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Return Date *</Label>
                <Input
                  type="date"
                  value={returnForm.return_date}
                  onChange={(e) => setReturnForm(f => ({ ...f, return_date: e.target.value }))}
                  data-testid="input-return-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Return Condition</Label>
                <Select
                  value={returnForm.return_condition}
                  onValueChange={(v) => setReturnForm(f => ({ ...f, return_condition: v }))}
                >
                  <SelectTrigger data-testid="select-return-condition"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionConfig).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
              <Checkbox
                id="lost-check"
                checked={returnForm.lost}
                onCheckedChange={(c) => setReturnForm(f => ({ ...f, lost: c }))}
                data-testid="checkbox-lost"
              />
              <Label htmlFor="lost-check" className="cursor-pointer text-red-700 font-medium">
                Mark as Lost
              </Label>
              <span className="text-xs text-red-500 ml-auto">Asset status → Lost</span>
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={returnForm.remarks}
                onChange={(e) => setReturnForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional notes about return condition"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleReturn}
                disabled={returnSaving}
                className={returnForm.lost ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0F172A] hover:bg-slate-800'}
                data-testid="btn-confirm-return"
              >
                {returnSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : returnForm.lost ? (
                  'Mark as Lost'
                ) : (
                  'Confirm Return'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


// ============ MAIN PAGE ============

const AssetDetail = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const isCreate = id === 'new';

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(!isCreate);

  useEffect(() => {
    if (isCreate) return;
    const fetchAsset = async () => {
      try {
        const response = await api.get(`/assets/${id}`);
        setAsset(response.data);
      } catch (error) {
        if (error.response?.status === 404) {
          toast.error('Asset not found');
          navigate('/assets');
        } else {
          toast.error('Failed to load asset');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [id, api, navigate, isCreate]);

  const handleSaved = (updatedAsset, wasCreate) => {
    if (wasCreate) {
      navigate(`/assets/${updatedAsset.id}`);
    } else {
      setAsset(updatedAsset);
    }
  };

  const handleDeleted = async () => {
    try {
      await api.delete(`/assets/${id}`);
      toast.success('Asset deleted');
      navigate('/assets');
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to delete');
    }
  };

  const handleAssetStatusChange = (newStatus) => {
    setAsset(prev => prev ? { ...prev, status: newStatus } : prev);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  const type = isCreate
    ? typeConfig.other
    : (typeConfig[asset?.asset_type] || typeConfig.other);
  const TypeIcon = type.Icon;

  return (
    <div className="space-y-6" data-testid="asset-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/assets">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${type.bg} flex items-center justify-center`}>
              <TypeIcon className={`w-6 h-6 ${type.text}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isCreate ? 'New Asset' : (asset?.name || 'Asset')}
              </h1>
              {!isCreate && asset && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-mono text-sm text-slate-500">{asset.asset_id}</span>
                  <Badge variant="outline" className={statusConfig[asset.status]?.badge}>
                    {statusConfig[asset.status]?.label || asset.status}
                  </Badge>
                  <Badge variant="outline" className={type.badge}>{type.label}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCreate ? (
        <DetailsTab
          asset={null}
          isCreate={true}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          api={api}
          assetId={id}
        />
      ) : (
        <Tabs defaultValue="details">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="issuances" data-testid="tab-issuances">
              Issuance History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <DetailsTab
              asset={asset}
              isCreate={false}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              api={api}
              assetId={id}
            />
          </TabsContent>

          <TabsContent value="issuances" className="mt-4">
            <IssuancesTab
              assetId={id}
              assetStatus={asset?.status}
              onAssetStatusChange={handleAssetStatusChange}
              api={api}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AssetDetail;

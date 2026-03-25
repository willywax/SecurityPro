import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Loader2, Save, Trash2, Edit, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import clientService from '@/services/clientService';
import siteService from '@/services/siteService';
import regionService from '@/services/regionService';
import { formatApiError } from '@/utils/errors';

const emptyForm = { client_id: '', region_id: '', site_name: '', region: '', district: '', ward: '', address: '', contact_person: '', contact_phone: '', status: 'active', notes: '' };
const phonePattern = /^(\+255|0)[67]\d{8}$/;

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreate = id === 'new' || !id;
  const [editing, setEditing] = useState(isCreate);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const clientsQuery = useQuery({ queryKey: ['clients', 'site-form'], queryFn: () => clientService.getAll({ page: 1, page_size: 100 }) });
  const regionsQuery = useQuery({ queryKey: ['regions', 'site-form'], queryFn: () => regionService.getAll({ status_filter: 'active' }) });
  const regions = Array.isArray(regionsQuery.data) ? regionsQuery.data : regionsQuery.data?.data || [];
  const regionPlaceholder = regionsQuery.isLoading
    ? 'Loading regions...'
    : regionsQuery.isError
      ? 'Failed to load regions'
      : regions.length === 0
        ? 'No active regions available'
        : 'Select region';
  const siteQuery = useQuery({ queryKey: ['site', id], queryFn: () => siteService.getById(id), enabled: !isCreate });

  useEffect(() => {
    if (siteQuery.data) {
      setFormData(siteQuery.data);
    }
  }, [siteQuery.data]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: null }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.client_id) nextErrors.client_id = 'Client is required';
    if (!formData.site_name?.trim()) nextErrors.site_name = 'Site name is required';
    if (!formData.status) nextErrors.status = 'Status is required';
    if (formData.contact_phone && !phonePattern.test(formData.contact_phone)) {
      nextErrors.contact_phone = 'Contact phone must be a valid Tanzanian number (+255XXXXXXXXX or 0XXXXXXXXX)';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const normalizePayload = (data) => ({
    client_id: data.client_id,
    site_name: data.site_name?.trim(),
    region_id: data.region_id || null,
    region: data.region?.trim() || null,
    district: data.district?.trim() || null,
    ward: data.ward?.trim() || null,
    address: data.address?.trim() || null,
    contact_person: data.contact_person?.trim() || null,
    contact_phone: data.contact_phone?.trim() || null,
    status: data.status,
    notes: data.notes?.trim() || null,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => (isCreate ? siteService.create(payload) : siteService.update(id, payload)),
    onSuccess: (site) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.setQueryData(['site', site.id], site);
      toast.success(isCreate ? 'Site created' : 'Site updated');
      navigate(`/sites/${site.id}`);
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to save site')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => siteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site deleted');
      navigate('/sites');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to delete site')),
  });

  if (siteQuery.isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (siteQuery.isError) return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(siteQuery.error, 'Failed to load site')}</CardContent></Card>;

  const site = siteQuery.data;
  const clients = clientsQuery.data?.data || [];

  return (
    <div className="space-y-6" data-testid="site-detail-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/sites"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><MapPin className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isCreate ? 'New Site' : site?.site_name}</h1>
              {!isCreate && site && <div className="flex items-center gap-2 mt-0.5"><span className="font-mono text-sm text-slate-500">{site.site_id}</span><Badge variant="outline">{site.status}</Badge></div>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setErrors({}); if (isCreate) navigate('/sites'); else { setFormData(site); setEditing(false); } }}>Cancel</Button>
              <Button onClick={() => { if (!validateForm()) return; saveMutation.mutate(normalizePayload(formData)); }} disabled={saveMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">{saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Site' : 'Save Changes'}</>}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}><Edit className="w-4 h-4 mr-2" />Edit</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate()}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
            </>
          )}
        </div>
      </div>

      {!isCreate && !editing && site?.client_name && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-700">Client: <span className="font-medium">{site.client_name}</span></span>
          <Link to={`/clients/${site.client_id}`} className="ml-auto text-sm text-blue-600 hover:underline">View Client →</Link>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Site Information</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Client</Label>
                <Select value={formData.client_id} onValueChange={(value) => updateField('client_id', value)}>
                  <SelectTrigger className={errors.client_id ? 'border-red-500' : ''}><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
              </div>
              <div className="space-y-2 md:col-span-2"><Label>Site Name</Label><Input value={formData.site_name} onChange={(event) => updateField('site_name', event.target.value)} className={errors.site_name ? 'border-red-500' : ''} />{errors.site_name && <p className="text-sm text-red-500">{errors.site_name}</p>}</div>
              <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(value) => updateField('status', value)}><SelectTrigger className={errors.status ? 'border-red-500' : ''}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>{errors.status && <p className="text-sm text-red-500">{errors.status}</p>}</div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={formData.region_id || ''} onValueChange={(value) => updateField('region_id', value)}>
                  <SelectTrigger disabled={regionsQuery.isLoading || regionsQuery.isError || regions.length === 0}><SelectValue placeholder={regionPlaceholder} /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.region_name} ({r.zone_name})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>District</Label><Input value={formData.district || ''} onChange={(event) => updateField('district', event.target.value)} /></div>
              <div className="space-y-2"><Label>Ward</Label><Input value={formData.ward || ''} onChange={(event) => updateField('ward', event.target.value)} /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person || ''} onChange={(event) => updateField('contact_person', event.target.value)} /></div>
              <div className="space-y-2"><Label>Contact Phone</Label><Input value={formData.contact_phone || ''} onChange={(event) => updateField('contact_phone', event.target.value)} className={errors.contact_phone ? 'border-red-500' : ''} />{errors.contact_phone && <p className="text-sm text-red-500">{errors.contact_phone}</p>}</div>
              <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={formData.address || ''} onChange={(event) => updateField('address', event.target.value)} rows={2} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={formData.notes || ''} onChange={(event) => updateField('notes', event.target.value)} rows={3} /></div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div><dt className="text-sm font-medium text-slate-500">Site Name</dt><dd className="mt-1 text-sm text-slate-900 font-medium">{site?.site_name}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd className="mt-1"><Badge variant="outline">{site?.status}</Badge></dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Region</dt><dd className="mt-1 text-sm text-slate-900">{site?.region_name || site?.region || '-'}{site?.zone_name ? <span className="text-slate-400 text-xs ml-1">({site.zone_name})</span> : null}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">District</dt><dd className="mt-1 text-sm text-slate-900">{site?.district || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Ward</dt><dd className="mt-1 text-sm text-slate-900">{site?.ward || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Contact Person</dt><dd className="mt-1 text-sm text-slate-900">{site?.contact_person || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Contact Phone</dt><dd className="mt-1 text-sm text-slate-900">{site?.contact_phone || '-'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm font-medium text-slate-500">Address</dt><dd className="mt-1 text-sm text-slate-900">{site?.address || '-'}</dd></div>
              <div className="sm:col-span-2 lg:col-span-3"><dt className="text-sm font-medium text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900">{site?.notes || '-'}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteDetail;

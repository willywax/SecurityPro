import { useState, useEffect } from 'react';
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
import { ArrowLeft, Loader2, Save, Trash2, Edit, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  under_review: 'bg-amber-100 text-amber-700 border-amber-200',
};
const statusLabels = { active: 'Active', inactive: 'Inactive', under_review: 'Under Review' };

const emptyForm = {
  client_id: '',
  site_name: '',
  region: '',
  district: '',
  ward: '',
  address: '',
  contact_person: '',
  contact_phone: '',
  status: 'active',
  notes: '',
};

const SiteDetail = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const isCreate = id === 'new';

  const [site, setSite] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreate);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Load all clients for the dropdown
  useEffect(() => {
    api.get('/clients?page_size=100')
      .then(r => setClients(r.data.clients))
      .catch(console.error);
  }, [api]);

  useEffect(() => {
    if (isCreate) return;
    const fetchSite = async () => {
      try {
        const response = await api.get(`/sites/${id}`);
        setSite(response.data);
        setFormData(response.data);
      } catch (error) {
        if (error.response?.status === 404) {
          toast.error('Site not found');
          navigate('/sites');
        } else {
          toast.error('Failed to load site');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, [id, api, navigate, isCreate]);

  const validate = () => {
    const newErrors = {};
    if (!formData.site_name?.trim()) newErrors.site_name = 'Site name is required';
    if (!formData.client_id) newErrors.client_id = 'Client is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...formData };
      ['region', 'district', 'ward', 'address', 'contact_person', 'contact_phone', 'notes'].forEach(f => {
        if (!payload[f]) payload[f] = null;
      });

      if (isCreate) {
        const response = await api.post('/sites', payload);
        toast.success('Site created');
        navigate(`/sites/${response.data.id}`);
      } else {
        const response = await api.put(`/sites/${id}`, payload);
        setSite(response.data);
        setFormData(response.data);
        setIsEditing(false);
        toast.success('Site updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/sites/${id}`);
      toast.success('Site deleted');
      navigate('/sites');
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (isCreate) { navigate('/sites'); return; }
    setFormData(site);
    setErrors({});
    setIsEditing(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="site-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/sites">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isCreate ? 'New Site' : (site?.site_name || 'Site')}
              </h1>
              {!isCreate && site && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm text-slate-500">{site.site_id}</span>
                  <Badge variant="outline" className={statusColors[site.status]}>
                    {statusLabels[site.status]}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} data-testid="btn-cancel-edit">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0F172A] hover:bg-slate-800"
                data-testid="btn-save"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Site' : 'Save Changes'}</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="btn-edit">
                <Edit className="w-4 h-4 mr-2" />Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid="btn-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Site</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete {site?.site_name}? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="btn-confirm-delete"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Parent Client Info (view mode) */}
      {!isCreate && !isEditing && site?.client_name && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-700">
            Client: <span className="font-medium">{site.client_name}</span>
          </span>
          <Link
            to={`/clients/${site.client_id}`}
            className="ml-auto text-sm text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
            data-testid="link-view-client"
          >
            View Client →
          </Link>
        </div>
      )}

      {/* Form / Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => handleChange('client_id', v)}
                >
                  <SelectTrigger
                    className={errors.client_id ? 'border-red-500' : ''}
                    data-testid="select-client"
                  >
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.client_name} ({c.client_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Site Name *</Label>
                <Input
                  value={formData.site_name}
                  onChange={(e) => handleChange('site_name', e.target.value)}
                  placeholder="e.g., Kampala Central Office"
                  className={errors.site_name ? 'border-red-500' : ''}
                  data-testid="input-site-name"
                />
                {errors.site_name && <p className="text-sm text-red-500">{errors.site_name}</p>}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger data-testid="select-site-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={formData.region || ''}
                  onChange={(e) => handleChange('region', e.target.value)}
                  placeholder="e.g., Central"
                  data-testid="input-region"
                />
              </div>

              <div className="space-y-2">
                <Label>District</Label>
                <Input
                  value={formData.district || ''}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder="e.g., Kampala"
                  data-testid="input-district"
                />
              </div>

              <div className="space-y-2">
                <Label>Ward / Village</Label>
                <Input
                  value={formData.ward || ''}
                  onChange={(e) => handleChange('ward', e.target.value)}
                  placeholder="e.g., Nakasero"
                  data-testid="input-ward"
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person || ''}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                  placeholder="Site contact name"
                  data-testid="input-contact-person"
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={formData.contact_phone || ''}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+256 700 123456"
                  data-testid="input-contact-phone"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Full site address"
                  rows={2}
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
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-slate-500">Site Name</dt>
                <dd className="mt-1 text-sm text-slate-900 font-medium">{site?.site_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant="outline" className={statusColors[site?.status]}>
                    {statusLabels[site?.status]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Region</dt>
                <dd className="mt-1 text-sm text-slate-900">{site?.region || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">District</dt>
                <dd className="mt-1 text-sm text-slate-900">{site?.district || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Ward</dt>
                <dd className="mt-1 text-sm text-slate-900">{site?.ward || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Contact Person</dt>
                <dd className="mt-1 text-sm text-slate-900">{site?.contact_person || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Contact Phone</dt>
                <dd className="mt-1 text-sm text-slate-900">{site?.contact_phone || '-'}</dd>
              </div>
              {site?.address && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">Address</dt>
                  <dd className="mt-1 text-sm text-slate-900">{site.address}</dd>
                </div>
              )}
              {site?.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-sm font-medium text-slate-500">Notes</dt>
                  <dd className="mt-1 text-sm text-slate-900">{site.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteDetail;

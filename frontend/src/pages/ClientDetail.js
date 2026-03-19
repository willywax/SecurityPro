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
import { ArrowLeft, Loader2, Save, Trash2, Edit, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  prospect: 'bg-blue-100 text-blue-700 border-blue-200',
};
const statusLabels = { active: 'Active', inactive: 'Inactive', prospect: 'Prospect' };

const emptyForm = {
  client_name: '',
  contact_person: '',
  phone_1: '',
  phone_2: '',
  email: '',
  billing_email: '',
  address: '',
  status: 'active',
  notes: '',
};

const ClientDetail = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const isCreate = id === 'new';

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreate);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isCreate) return;
    const fetchClient = async () => {
      try {
        const response = await api.get(`/clients/${id}`);
        setClient(response.data);
        setFormData(response.data);
      } catch (error) {
        if (error.response?.status === 404) {
          toast.error('Client not found');
          navigate('/clients');
        } else {
          toast.error('Failed to load client');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id, api, navigate, isCreate]);

  const validate = () => {
    const newErrors = {};
    if (!formData.client_name?.trim()) newErrors.client_name = 'Client name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';
    if (formData.billing_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billing_email))
      newErrors.billing_email = 'Invalid email format';
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
      ['phone_2', 'email', 'billing_email', 'address', 'notes', 'contact_person', 'phone_1'].forEach(f => {
        if (!payload[f]) payload[f] = null;
      });

      if (isCreate) {
        const response = await api.post('/clients', payload);
        toast.success('Client created');
        navigate(`/clients/${response.data.id}`);
      } else {
        const response = await api.put(`/clients/${id}`, payload);
        setClient(response.data);
        setFormData(response.data);
        setIsEditing(false);
        toast.success('Client updated');
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
      await api.delete(`/clients/${id}`);
      toast.success('Client deleted');
      navigate('/clients');
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (isCreate) { navigate('/clients'); return; }
    setFormData(client);
    setErrors({});
    setIsEditing(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/clients">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isCreate ? 'New Client' : (client?.client_name || 'Client')}
              </h1>
              {!isCreate && client && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm text-slate-500">{client.client_id}</span>
                  <Badge variant="outline" className={statusColors[client.status]}>
                    {statusLabels[client.status]}
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
                  <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Client' : 'Save Changes'}</>
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
                    <AlertDialogTitle>Delete Client</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete {client?.client_name}? This cannot be undone.
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

      {/* Form / Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Client Name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className={errors.client_name ? 'border-red-500' : ''}
                  data-testid="input-client-name"
                />
                {errors.client_name && <p className="text-sm text-red-500">{errors.client_name}</p>}
              </div>

              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person || ''}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                  placeholder="Primary contact name"
                  data-testid="input-contact-person"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger data-testid="select-client-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phone 1</Label>
                <Input
                  value={formData.phone_1 || ''}
                  onChange={(e) => handleChange('phone_1', e.target.value)}
                  placeholder="+256 700 123456"
                  data-testid="input-phone-1"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone 2</Label>
                <Input
                  value={formData.phone_2 || ''}
                  onChange={(e) => handleChange('phone_2', e.target.value)}
                  placeholder="+256 700 654321"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@company.com"
                  type="email"
                  className={errors.email ? 'border-red-500' : ''}
                  data-testid="input-email"
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label>Billing Email</Label>
                <Input
                  value={formData.billing_email || ''}
                  onChange={(e) => handleChange('billing_email', e.target.value)}
                  placeholder="billing@company.com"
                  type="email"
                  className={errors.billing_email ? 'border-red-500' : ''}
                  data-testid="input-billing-email"
                />
                {errors.billing_email && <p className="text-sm text-red-500">{errors.billing_email}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Physical address"
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
                <dt className="text-sm font-medium text-slate-500">Client Name</dt>
                <dd className="mt-1 text-sm text-slate-900 font-medium">{client?.client_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Contact Person</dt>
                <dd className="mt-1 text-sm text-slate-900">{client?.contact_person || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <Badge variant="outline" className={statusColors[client?.status]}>
                    {statusLabels[client?.status]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Phone 1</dt>
                <dd className="mt-1 text-sm text-slate-900">{client?.phone_1 || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Phone 2</dt>
                <dd className="mt-1 text-sm text-slate-900">{client?.phone_2 || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="mt-1 text-sm text-slate-900">{client?.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Billing Email</dt>
                <dd className="mt-1 text-sm text-slate-900">{client?.billing_email || '-'}</dd>
              </div>
              {client?.address && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">Address</dt>
                  <dd className="mt-1 text-sm text-slate-900">{client.address}</dd>
                </div>
              )}
              {client?.notes && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-sm font-medium text-slate-500">Notes</dt>
                  <dd className="mt-1 text-sm text-slate-900">{client.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetail;

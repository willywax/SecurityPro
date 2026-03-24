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
import { ArrowLeft, Loader2, Save, Trash2, Edit, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import clientService from '@/services/clientService';
import { formatApiError } from '@/utils/errors';

const emptyForm = { client_name: '', contact_person: '', phone_1: '', phone_2: '', email: '', billing_email: '', address: '', status: 'active', notes: '' };

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreate = id === 'new' || !id;
  const [editing, setEditing] = useState(isCreate);
  const [formData, setFormData] = useState(emptyForm);

  const clientQuery = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getById(id),
    enabled: !isCreate,
  });

  useEffect(() => {
    if (clientQuery.data) {
      setFormData(clientQuery.data);
    }
  }, [clientQuery.data]);

  const cleanPayload = (data) => {
    const cleaned = { ...data };
    // Replace empty strings with null so EmailStr fields pass backend validation
    ['email', 'billing_email', 'phone_1', 'phone_2', 'contact_person', 'address', 'notes'].forEach((f) => {
      if (cleaned[f] === '') cleaned[f] = null;
    });
    return cleaned;
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      const clean = cleanPayload(payload);
      return isCreate ? clientService.create(clean) : clientService.update(id, clean);
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.setQueryData(['client', client.id], client);
      toast.success(isCreate ? 'Client created' : 'Client updated');
      navigate(`/clients/${client.id}`);
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to save client')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
      navigate('/clients');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to delete client')),
  });

  if (clientQuery.isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (clientQuery.isError) return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(clientQuery.error, 'Failed to load client')}</CardContent></Card>;

  const client = clientQuery.data;

  return (
    <div className="space-y-6" data-testid="client-detail-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isCreate ? 'New Client' : client?.client_name}</h1>
              {!isCreate && client && <div className="flex items-center gap-2 mt-0.5"><span className="font-mono text-sm text-slate-500">{client.client_id}</span><Badge variant="outline">{client.status}</Badge></div>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { if (isCreate) navigate('/clients'); else { setFormData(client); setEditing(false); } }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">{saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Client' : 'Save Changes'}</>}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}><Edit className="w-4 h-4 mr-2" />Edit</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate()}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Client Information</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2"><Label>Client Name</Label><Input value={formData.client_name} onChange={(event) => setFormData((current) => ({ ...current, client_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person || ''} onChange={(event) => setFormData((current) => ({ ...current, contact_person: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(value) => setFormData((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="prospect">Prospect</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Phone 1</Label><Input value={formData.phone_1 || ''} onChange={(event) => setFormData((current) => ({ ...current, phone_1: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone 2</Label><Input value={formData.phone_2 || ''} onChange={(event) => setFormData((current) => ({ ...current, phone_2: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={formData.email || ''} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Billing Email</Label><Input value={formData.billing_email || ''} onChange={(event) => setFormData((current) => ({ ...current, billing_email: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={formData.address || ''} onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))} rows={2} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={formData.notes || ''} onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))} rows={3} /></div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div><dt className="text-sm font-medium text-slate-500">Client Name</dt><dd className="mt-1 text-sm text-slate-900 font-medium">{client?.client_name}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Contact Person</dt><dd className="mt-1 text-sm text-slate-900">{client?.contact_person || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd className="mt-1"><Badge variant="outline">{client?.status}</Badge></dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Phone 1</dt><dd className="mt-1 text-sm text-slate-900">{client?.phone_1 || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Phone 2</dt><dd className="mt-1 text-sm text-slate-900">{client?.phone_2 || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Email</dt><dd className="mt-1 text-sm text-slate-900">{client?.email || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Billing Email</dt><dd className="mt-1 text-sm text-slate-900">{client?.billing_email || '-'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm font-medium text-slate-500">Address</dt><dd className="mt-1 text-sm text-slate-900">{client?.address || '-'}</dd></div>
              <div className="sm:col-span-2 lg:col-span-3"><dt className="text-sm font-medium text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900">{client?.notes || '-'}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetail;

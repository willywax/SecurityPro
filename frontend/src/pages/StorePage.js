import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Loader2, Store, Package, PackageCheck, DollarSign, Pencil, X, Save } from 'lucide-react';
import storeService from '@/services/storeService';
import { toast } from 'sonner';

const StorePage = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const { data: store, isLoading, isError } = useQuery({
    queryKey: ['store'],
    queryFn: storeService.get,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => storeService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      toast.success('Store updated');
      setEditing(false);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Update failed'),
  });

  const openEdit = () => {
    setForm({
      store_name: store.store_name,
      location: store.location || '',
      address: store.address || '',
      phone: store.phone || '',
      notes: store.notes || '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    const payload = {};
    Object.keys(form).forEach(k => { if (form[k] !== '') payload[k] = form[k]; });
    updateMutation.mutate(payload);
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (isError) return <div className="py-12 text-center text-red-600">Failed to load store</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Store</h1>
          <p className="text-slate-500 text-sm mt-1">Central inventory store details</p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="w-4 h-4 mr-2" /> Edit Store
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Item Types</p>
                <p className="text-xl font-bold text-slate-900">{store.total_item_types}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg"><Store className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Total Units</p>
                <p className="text-xl font-bold text-slate-900">{store.total_units}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg"><PackageCheck className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Issued Out</p>
                <p className="text-xl font-bold text-slate-900">{store.total_issued}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Total Value</p>
                <p className="text-xl font-bold text-slate-900">TZS {store.total_value?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" /> Store Details
            <Badge className={store.status === 'active' ? 'bg-emerald-100 text-emerald-700 ml-auto' : 'bg-slate-100 text-slate-700 ml-auto'}>
              {store.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Store Name', key: 'store_name' },
                  { label: 'Location', key: 'location' },
                  { label: 'Address', key: 'address' },
                  { label: 'Phone', key: 'phone' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                    <Input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'Store Name', value: store.store_name },
                { label: 'Manager', value: store.manager_name || '—' },
                { label: 'Location', value: store.location || '—' },
                { label: 'Phone', value: store.phone || '—' },
                { label: 'Address', value: store.address || '—' },
                { label: 'Notes', value: store.notes || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500 uppercase tracking-wide">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StorePage;

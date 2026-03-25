import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import assetTypeService from '@/services/assetTypeService';
import { toast } from 'sonner';

const InventoryCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    asset_type_id: '',
    item_name: '',
    description: '',
    unit_cost: '',
    initial_count: '0',
    notes: '',
  });
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: assetTypes = [], refetch: refetchTypes } = useQuery({
    queryKey: ['asset-types'],
    queryFn: assetTypeService.list,
  });

  const createTypeMutation = useMutation({
    mutationFn: (data) => assetTypeService.create(data),
    onSuccess: (newType) => {
      refetchTypes();
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      setForm(f => ({ ...f, asset_type_id: newType.id }));
      setNewTypeName('');
      setAddingType(false);
      toast.success('Asset type created');
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create type'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => inventoryService.create(data),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item created');
      navigate(`/inventory/${item.id}`);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create item'),
  });

  const validate = () => {
    const e = {};
    if (!form.asset_type_id) e.asset_type_id = 'Required';
    if (!form.item_name.trim()) e.item_name = 'Required';
    if (form.unit_cost && isNaN(Number(form.unit_cost))) e.unit_cost = 'Must be a number';
    if (isNaN(Number(form.initial_count)) || Number(form.initial_count) < 0) e.initial_count = 'Must be 0 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({
      asset_type_id: form.asset_type_id,
      item_name: form.item_name.trim(),
      description: form.description || undefined,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
      initial_count: Number(form.initial_count),
      notes: form.notes || undefined,
    });
  };

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Inventory Item</h1>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Asset Type */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Asset Type *</label>
              {addingType ? (
                <div className="flex gap-2">
                  <Input
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="New type name"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => createTypeMutation.mutate({ type_name: newTypeName })}
                    disabled={!newTypeName.trim() || createTypeMutation.isPending}
                    className="bg-[#0F172A] hover:bg-slate-800"
                  >
                    {createTypeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setAddingType(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={form.asset_type_id} onValueChange={v => set('asset_type_id', v)}>
                    <SelectTrigger className={`flex-1 ${errors.asset_type_id ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.type_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setAddingType(true)}>
                    <Plus className="w-4 h-4 mr-1" /> New Type
                  </Button>
                </div>
              )}
              {errors.asset_type_id && <p className="text-xs text-red-600 mt-1">{errors.asset_type_id}</p>}
            </div>

            {/* Item Name */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Item Name *</label>
              <Input
                value={form.item_name}
                onChange={e => set('item_name', e.target.value)}
                className={errors.item_name ? 'border-red-500' : ''}
                placeholder="e.g. Pistol 9mm"
              />
              {errors.item_name && <p className="text-xs text-red-600 mt-1">{errors.item_name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
            </div>

            {/* Unit Cost & Initial Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Unit Cost (TZS)</label>
                <Input
                  type="number"
                  min="0"
                  value={form.unit_cost}
                  onChange={e => set('unit_cost', e.target.value)}
                  className={errors.unit_cost ? 'border-red-500' : ''}
                  placeholder="0"
                />
                {errors.unit_cost && <p className="text-xs text-red-600 mt-1">{errors.unit_cost}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Initial Stock Qty</label>
                <Input
                  type="number"
                  min="0"
                  value={form.initial_count}
                  onChange={e => set('initial_count', e.target.value)}
                  className={errors.initial_count ? 'border-red-500' : ''}
                />
                {errors.initial_count && <p className="text-xs text-red-600 mt-1">{errors.initial_count}</p>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Item
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryCreate;

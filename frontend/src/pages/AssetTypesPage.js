import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Plus, Pencil, Trash2, X, Save, Tag } from 'lucide-react';
import assetTypeService from '@/services/assetTypeService';
import { toast } from 'sonner';

const AssetTypesPage = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { data: types = [], isLoading, isError } = useQuery({
    queryKey: ['asset-types'],
    queryFn: assetTypeService.list,
  });

  const createMutation = useMutation({
    mutationFn: (data) => assetTypeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success('Asset type created');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => assetTypeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success('Updated');
      setEditId(null);
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => assetTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      toast.success('Deleted');
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Cannot delete (items exist)'),
  });

  const openEdit = (t) => {
    setEditId(t.id);
    setEditName(t.type_name);
    setEditDesc(t.description || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Asset Types</h1>
          <p className="text-slate-500 text-sm mt-1">Manage predefined and custom asset categories</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#0F172A] hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" /> Add Type
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Asset Type</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Name *</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Handcuffs" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
                <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate({ type_name: newName, description: newDesc || undefined })}
                  disabled={!newName.trim() || createMutation.isPending}
                  className="bg-[#0F172A] hover:bg-slate-800"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                <Button variant="outline" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : isError ? (
        <Card><CardContent className="py-12 text-center text-red-600">Failed to load asset types</CardContent></Card>
      ) : types.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No asset types yet</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-slate-900">
                    {editId === t.id ? (
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 w-40" />
                    ) : t.type_name}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {editId === t.id ? (
                      <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="h-8 w-48" placeholder="Optional" />
                    ) : (t.description || '—')}
                  </TableCell>
                  <TableCell>
                    <Badge className={t.is_custom ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                      {t.is_custom ? 'Custom' : 'Predefined'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {editId === t.id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: t.id, data: { type_name: editName, description: editDesc || undefined } })}
                          disabled={!editName.trim() || updateMutation.isPending}
                          className="bg-[#0F172A] hover:bg-slate-800"
                        >
                          {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditId(null)}><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Delete "${t.type_name}"?`)) deleteMutation.mutate(t.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AssetTypesPage;

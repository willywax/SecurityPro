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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Loader2, Save, Trash2, Edit, MapPin, Building2, Users, X, Plus, ArrowRightLeft, UserMinus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import clientService from '@/services/clientService';
import siteService from '@/services/siteService';
import regionService from '@/services/regionService';
import allocationService from '@/services/allocationService';
import { formatApiError } from '@/utils/errors';

const emptyForm = { client_id: '', region_id: '', site_name: '', region: '', district: '', ward: '', address: '', contact_person: '', contact_phone: '', status: 'active', notes: '' };
const phonePattern = /^(\+255|0)[67]\d{8}$/;
const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '-');

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreate = id === 'new' || !id;
  const [editing, setEditing] = useState(isCreate);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee_id: '', start_date: new Date().toISOString().split('T')[0], notes: '' });
  const [guardSearch, setGuardSearch] = useState('');

  // Transfer modal
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferForm, setTransferForm] = useState({ to_site_id: '', transfer_date: new Date().toISOString().split('T')[0], reason: '' });
  const [siteSearch, setSiteSearch] = useState('');

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState(null);

  // Client combobox
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientLabel, setSelectedClientLabel] = useState('');

  const clientSearchQuery = useQuery({
    queryKey: ['clients', 'search', clientSearch],
    queryFn: () => clientService.getAll({ page: 1, page_size: 20, search: clientSearch }),
    enabled: clientSearch.length >= 2,
    staleTime: 30000,
  });
  const searchedClients = clientSearch.length >= 2 ? (clientSearchQuery.data?.data || []) : [];
  const regionsQuery = useQuery({ queryKey: ['regions', 'site-form'], queryFn: () => regionService.getAll({ status_filter: 'active' }) });
  const regions = Array.isArray(regionsQuery.data) ? regionsQuery.data : regionsQuery.data?.data || [];
  const regionPlaceholder = regionsQuery.isLoading ? 'Loading regions...' : regionsQuery.isError ? 'Failed to load regions' : regions.length === 0 ? 'No active regions available' : 'Select region';
  const siteQuery = useQuery({ queryKey: ['site', id], queryFn: () => siteService.getById(id), enabled: !isCreate });
  const guardsQuery = useQuery({ queryKey: ['site', id, 'guards'], queryFn: () => allocationService.getSiteGuards(id), enabled: !isCreate });
  const availableGuardsQuery = useQuery({
    queryKey: ['available-guards', guardSearch],
    queryFn: () => allocationService.getAvailableGuards({ search: guardSearch || undefined }),
    enabled: showAssignModal,
  });
  const allSitesQuery = useQuery({
    queryKey: ['sites', 'transfer-dropdown'],
    queryFn: () => siteService.getAll({ page: 1, page_size: 200 }),
    enabled: !!transferTarget,
  });

  useEffect(() => {
    if (siteQuery.data) {
      setFormData(siteQuery.data);
      if (siteQuery.data.client_name) {
        setSelectedClientLabel(siteQuery.data.client_name);
      }
    }
  }, [siteQuery.data]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }));
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

  const assignMutation = useMutation({
    mutationFn: (payload) => allocationService.allocateGuard(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', id, 'guards'] });
      queryClient.invalidateQueries({ queryKey: ['available-guards'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAssignModal(false);
      setAssignForm({ employee_id: '', start_date: new Date().toISOString().split('T')[0], notes: '' });
      setGuardSearch('');
      toast.success('Guard assigned to site');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to assign guard')),
  });

  const transferMutation = useMutation({
    mutationFn: ({ empId, payload }) => allocationService.transferGuard(empId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', id, 'guards'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setTransferTarget(null);
      setTransferForm({ to_site_id: '', transfer_date: new Date().toISOString().split('T')[0], reason: '' });
      toast.success('Guard transferred');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to transfer guard')),
  });

  const removeMutation = useMutation({
    mutationFn: (empId) => allocationService.deallocateGuard(id, empId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', id, 'guards'] });
      queryClient.invalidateQueries({ queryKey: ['available-guards'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setRemoveTarget(null);
      toast.success('Guard removed from site');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to remove guard')),
  });

  if (siteQuery.isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (siteQuery.isError) return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(siteQuery.error, 'Failed to load site')}</CardContent></Card>;

  const site = siteQuery.data;
  const allSites = (allSitesQuery.data?.data || []).filter(s => s.id !== id);
  const filteredSites = siteSearch ? allSites.filter(s => s.site_name.toLowerCase().includes(siteSearch.toLowerCase())) : allSites;
  const allocatedCount = guardsQuery.data?.length ?? 0;

  const infoForm = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2 md:col-span-2">
        <Label>Client</Label>
        <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn('w-full justify-between font-normal', !formData.client_id && 'text-slate-500', errors.client_id ? 'border-red-500' : '')}
            >
              <span className="truncate">{formData.client_id ? selectedClientLabel || 'Selected' : 'Search clients...'}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Type 2+ characters to search..."
                value={clientSearch}
                onValueChange={setClientSearch}
              />
              <CommandList>
                {clientSearch.length < 2 ? (
                  <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
                ) : clientSearchQuery.isLoading ? (
                  <CommandEmpty>Loading...</CommandEmpty>
                ) : searchedClients.length === 0 ? (
                  <CommandEmpty>No clients found</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {searchedClients.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.client_name} ${c.client_id || ''}`}
                        onSelect={() => {
                          updateField('client_id', c.id);
                          setSelectedClientLabel(`${c.client_name}${c.client_id ? ` (${c.client_id})` : ''}`);
                          setClientComboOpen(false);
                          setClientSearch('');
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4 shrink-0', formData.client_id === c.id ? 'opacity-100' : 'opacity-0')} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.client_name}</p>
                          {c.client_id && <p className="text-xs text-slate-500">{c.client_id}</p>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.client_id && <p className="text-sm text-red-500">{errors.client_id}</p>}
      </div>
      <div className="space-y-2 md:col-span-2"><Label>Site Name</Label><Input value={formData.site_name} onChange={(e) => updateField('site_name', e.target.value)} className={errors.site_name ? 'border-red-500' : ''} />{errors.site_name && <p className="text-sm text-red-500">{errors.site_name}</p>}</div>
      <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(v) => updateField('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Region</Label><Select value={formData.region_id || ''} onValueChange={(v) => updateField('region_id', v)}><SelectTrigger disabled={regions.length === 0}><SelectValue placeholder={regionPlaceholder} /></SelectTrigger><SelectContent>{regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.region_name} ({r.zone_name})</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>District</Label><Input value={formData.district || ''} onChange={(e) => updateField('district', e.target.value)} /></div>
      <div className="space-y-2"><Label>Ward</Label><Input value={formData.ward || ''} onChange={(e) => updateField('ward', e.target.value)} /></div>
      <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person || ''} onChange={(e) => updateField('contact_person', e.target.value)} /></div>
      <div className="space-y-2"><Label>Contact Phone</Label><Input value={formData.contact_phone || ''} onChange={(e) => updateField('contact_phone', e.target.value)} className={errors.contact_phone ? 'border-red-500' : ''} />{errors.contact_phone && <p className="text-sm text-red-500">{errors.contact_phone}</p>}</div>
      <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={formData.address || ''} onChange={(e) => updateField('address', e.target.value)} rows={2} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={formData.notes || ''} onChange={(e) => updateField('notes', e.target.value)} rows={3} /></div>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="site-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/sites"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><MapPin className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isCreate ? 'New Site' : site?.site_name}</h1>
              {!isCreate && site && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm text-slate-500">{site.site_id}</span>
                  <Badge variant="outline">{site.status}</Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Users className="w-3 h-3 mr-1" />{allocatedCount} guard{allocatedCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setErrors({}); if (isCreate) navigate('/sites'); else { setFormData(site); setEditing(false); } }}>Cancel</Button>
              <Button onClick={() => { if (!validateForm()) return; saveMutation.mutate(normalizePayload(formData)); }} disabled={saveMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Site' : 'Save Changes'}</>}
              </Button>
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

      {isCreate ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Site Information</CardTitle></CardHeader>
          <CardContent>{infoForm}</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent p-0 h-auto">
            <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3">
              <MapPin className="w-4 h-4 mr-2" />Info
            </TabsTrigger>
            <TabsTrigger value="guards" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3">
              <Users className="w-4 h-4 mr-2" />Guards
              {allocatedCount > 0 && <span className="ml-1.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{allocatedCount}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Site Information</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <>
                    {infoForm}
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => { if (!validateForm()) return; saveMutation.mutate(normalizePayload(formData)); }} disabled={saveMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save
                      </Button>
                      <Button variant="outline" onClick={() => { setErrors({}); setFormData(site); setEditing(false); }}>Cancel</Button>
                    </div>
                  </>
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
          </TabsContent>

          <TabsContent value="guards" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Allocated Guards</h3>
              <Button className="bg-[#0F172A] hover:bg-slate-800" onClick={() => setShowAssignModal(true)}>
                <Plus className="w-4 h-4 mr-2" />Assign Guard
              </Button>
            </div>
            {guardsQuery.isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : !guardsQuery.data?.length ? (
              <Card><CardContent className="py-12 text-center text-slate-500">No guards currently allocated to this site</CardContent></Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Guard</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Guard No</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Since</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guardsQuery.data.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {alloc.photo_url ? (
                              <img src={alloc.photo_url} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                                {alloc.employee_name?.[0]}
                              </div>
                            )}
                            <Link to={`/employees/${alloc.employee_id}`} className="font-medium text-slate-900 hover:underline">{alloc.employee_name}</Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{alloc.guard_no || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{alloc.phone || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(alloc.start_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setTransferTarget(alloc); setTransferForm({ to_site_id: '', transfer_date: new Date().toISOString().split('T')[0], reason: '' }); }}>
                              <ArrowRightLeft className="w-3 h-3 mr-1" />Transfer
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setRemoveTarget(alloc)}>
                              <UserMinus className="w-3 h-3 mr-1" />Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Assign Guard Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Assign Guard to {site?.site_name}</CardTitle>
                <button onClick={() => { setShowAssignModal(false); setGuardSearch(''); setAssignForm({ employee_id: '', start_date: new Date().toISOString().split('T')[0], notes: '' }); }}>
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Search Available Guards</Label>
                <Input placeholder="Name, guard no..." value={guardSearch} onChange={e => setGuardSearch(e.target.value)} />
              </div>
              <div className="border rounded-lg overflow-hidden">
                {availableGuardsQuery.isLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                ) : !availableGuardsQuery.data?.length ? (
                  <p className="text-sm text-slate-500 text-center py-6">No available guards found</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {availableGuardsQuery.data.map(g => (
                      <button key={g.id} type="button" onClick={() => setAssignForm(f => ({ ...f, employee_id: g.id }))}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${assignForm.employee_id === g.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{g.first_name} {g.last_name}</p>
                            <p className="text-xs text-slate-500">{[g.guard_no, g.phone_1, g.region_name].filter(Boolean).join(' · ')}</p>
                          </div>
                          {assignForm.employee_id === g.id && <span className="text-xs text-blue-600 font-medium">Selected</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Start Date *</Label>
                  <Input type="date" value={assignForm.start_date} onChange={e => setAssignForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="bg-[#0F172A] hover:bg-slate-800" disabled={assignMutation.isPending}
                  onClick={() => {
                    if (!assignForm.employee_id) { toast.error('Select a guard'); return; }
                    if (!assignForm.start_date) { toast.error('Start date is required'); return; }
                    assignMutation.mutate({ employee_id: assignForm.employee_id, start_date: assignForm.start_date, notes: assignForm.notes || null });
                  }}>
                  {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Assign
                </Button>
                <Button variant="outline" onClick={() => { setShowAssignModal(false); setGuardSearch(''); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer Modal */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Transfer Guard</CardTitle>
                <button onClick={() => setTransferTarget(null)}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
                <p className="font-medium text-slate-900">{transferTarget.employee_name}</p>
                <p className="text-slate-500">From: {site?.site_name}</p>
              </div>
              <div className="space-y-1">
                <Label>Search Destination Site</Label>
                <Input placeholder="Site name..." value={siteSearch} onChange={e => setSiteSearch(e.target.value)} />
              </div>
              <div className="border rounded-lg overflow-hidden">
                {allSitesQuery.isLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : !filteredSites.length ? (
                  <p className="text-sm text-slate-500 text-center py-4">No sites found</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {filteredSites.map(s => (
                      <button key={s.id} type="button" onClick={() => setTransferForm(f => ({ ...f, to_site_id: s.id }))}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm ${transferForm.to_site_id === s.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}>
                        <span className="font-medium text-slate-900">{s.site_name}</span>
                        {s.zone_name && <span className="text-slate-500 ml-2 text-xs">({s.zone_name})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Transfer Date *</Label>
                <Input type="date" value={transferForm.transfer_date} onChange={e => setTransferForm(f => ({ ...f, transfer_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Reason *</Label>
                <Input value={transferForm.reason} onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for transfer" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="bg-[#0F172A] hover:bg-slate-800" disabled={transferMutation.isPending}
                  onClick={() => {
                    if (!transferForm.to_site_id) { toast.error('Select a destination site'); return; }
                    if (!transferForm.transfer_date) { toast.error('Transfer date is required'); return; }
                    if (!transferForm.reason.trim()) { toast.error('Reason is required'); return; }
                    transferMutation.mutate({ empId: transferTarget.employee_id, payload: transferForm });
                  }}>
                  {transferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}Transfer
                </Button>
                <Button variant="outline" onClick={() => setTransferTarget(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remove Confirm */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Remove Guard from Site</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">Remove <span className="font-medium">{removeTarget.employee_name}</span> from <span className="font-medium">{site?.site_name}</span>? They will be set back to available.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(removeTarget.employee_id)}>
                  {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserMinus className="w-4 h-4 mr-2" />}Remove
                </Button>
                <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SiteDetail;

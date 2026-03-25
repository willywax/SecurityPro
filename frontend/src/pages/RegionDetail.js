import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Save, Edit, Trash2, Loader2, MapPin, Users, Globe, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiError } from '@/utils/errors';
import regionService from '@/services/regionService';
import zoneService from '@/services/zoneService';

const emptyForm = { zone_id: '', region_name: '', notes: '', status: 'active' };

const RegionDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreate = id === 'new' || !id;
  const [editing, setEditing] = useState(isCreate);
  const [formData, setFormData] = useState({
    ...emptyForm,
    zone_id: searchParams.get('zone_id') || '',
  });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ new_zone_id: '', notes: '' });

  const regionQuery = useQuery({
    queryKey: ['region', id],
    queryFn: () => regionService.getById(id),
    enabled: !isCreate,
  });

  const zonesQuery = useQuery({
    queryKey: ['zones', 'all'],
    queryFn: () => zoneService.getAll(),
  });
  const zones = zonesQuery.data || [];

  useEffect(() => {
    if (regionQuery.data) setFormData(regionQuery.data);
  }, [regionQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (data) => (isCreate ? regionService.create(data) : regionService.update(id, data)),
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.setQueryData(['region', region.id], region);
      toast.success(isCreate ? 'Region created' : 'Region updated');
      if (isCreate) navigate(`/regions/${region.id}`);
      else setEditing(false);
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to save region')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => regionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Region deleted');
      navigate('/regions');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to delete region')),
  });

  const transferMutation = useMutation({
    mutationFn: (data) => regionService.transfer(id, data),
    onSuccess: (region) => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.setQueryData(['region', id], region);
      setShowTransferModal(false);
      setTransferForm({ new_zone_id: '', notes: '' });
      toast.success(`Region transferred to ${region.zone_name}`);
    },
    onError: (error) => toast.error(formatApiError(error, 'Transfer failed')),
  });

  const region = regionQuery.data;

  if (!isCreate && regionQuery.isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }
  if (!isCreate && regionQuery.isError) {
    return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(regionQuery.error, 'Failed to load region')}</CardContent></Card>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/regions"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isCreate ? 'New Region' : region?.region_name}
              </h1>
              {!isCreate && region && (
                <div className="flex items-center gap-2 mt-0.5">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-sm text-slate-500">{region.zone_name}</span>
                  <Badge variant="outline" className={region.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>
                    {region.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isCreate && !editing && (
            <Button variant="outline" onClick={() => setShowTransferModal(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />Transfer Zone
            </Button>
          )}
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { if (isCreate) navigate('/regions'); else { setFormData(region); setEditing(false); } }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Region' : 'Save Changes'}</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}><Edit className="w-4 h-4 mr-2" />Edit</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate()}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader><CardTitle className="text-lg text-blue-900">Transfer Region to Another Zone</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Zone</Label>
              <p className="text-sm font-medium text-slate-700 p-2 bg-white rounded border">{region?.zone_name}</p>
            </div>
            <div className="space-y-2">
              <Label>New Zone *</Label>
              <Select value={transferForm.new_zone_id} onValueChange={(v) => setTransferForm((f) => ({ ...f, new_zone_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select target zone" /></SelectTrigger>
                <SelectContent>
                  {zones.filter((z) => z.id !== region?.zone_id).map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={transferForm.notes} onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Reason for transfer..." rows={2} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={() => transferMutation.mutate(transferForm)} disabled={!transferForm.new_zone_id || transferMutation.isPending} className="bg-blue-700 hover:bg-blue-800 text-white">
                {transferMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Transferring...</> : 'Confirm Transfer'}
              </Button>
              <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            </div>
            <div className="md:col-span-2 text-sm text-blue-700">
              All {region?.employee_count ?? 0} employee(s) and {region?.site_count ?? 0} site(s) in this region will automatically follow.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Region Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Region Information</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zone *</Label>
                <Select value={formData.zone_id} onValueChange={(v) => setFormData((f) => ({ ...f, zone_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.zone_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region Name *</Label>
                <Input value={formData.region_name} onChange={(e) => setFormData((f) => ({ ...f, region_name: e.target.value }))} placeholder="e.g. Arusha" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div><dt className="text-sm font-medium text-slate-500">Region Name</dt><dd className="mt-1 text-sm font-medium text-slate-900">{region?.region_name}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Zone</dt><dd className="mt-1 text-sm text-slate-900">{region?.zone_name || '-'}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd className="mt-1"><Badge variant="outline" className={region?.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>{region?.status}</Badge></dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Employees</dt><dd className="mt-1 text-sm text-slate-900">{region?.employee_count ?? 0}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Sites</dt><dd className="mt-1 text-sm text-slate-900">{region?.site_count ?? 0}</dd></div>
              <div className="sm:col-span-2 lg:col-span-3"><dt className="text-sm font-medium text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900">{region?.notes || '-'}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>

      {!isCreate && (
        <>
          {/* Employees */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />Employees in this Region</CardTitle></CardHeader>
            <CardContent>
              {(region?.employees || []).length === 0 ? (
                <p className="text-sm text-slate-500 italic">No employees assigned to this region</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {region.employees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{emp.full_name}</TableCell>
                        <TableCell className="text-slate-600 font-mono text-sm">{emp.employee_id}</TableCell>
                        <TableCell className="text-slate-600">{emp.job_title || '-'}</TableCell>
                        <TableCell>
                          <Link to={`/employees/${emp.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">View →</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Sites */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5" />Sites in this Region</CardTitle></CardHeader>
            <CardContent>
              {(region?.sites || []).length === 0 ? (
                <p className="text-sm text-slate-500 italic">No sites assigned to this region</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Site Name</TableHead>
                      <TableHead>Site ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {region.sites.map((site) => (
                      <TableRow key={site.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{site.site_name}</TableCell>
                        <TableCell className="text-slate-600 font-mono text-sm">{site.site_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={site.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>
                            {site.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/sites/${site.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">View →</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Transfer History */}
          {(region?.transfer_history || []).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" />Transfer History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Date</TableHead>
                      <TableHead>From Zone</TableHead>
                      <TableHead>To Zone</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {region.transfer_history.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-slate-600">{t.transferred_date}</TableCell>
                        <TableCell className="text-slate-600">{t.from_zone_name || '-'}</TableCell>
                        <TableCell className="font-medium text-slate-900">{t.to_zone_name || '-'}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{t.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default RegionDetail;

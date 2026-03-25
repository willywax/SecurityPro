import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Save, Edit, Trash2, Plus, Loader2, Globe, Users, MapPin, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiError } from '@/utils/errors';
import zoneService from '@/services/zoneService';
import regionService from '@/services/regionService';
import employeeService from '@/services/employeeService';

const emptyForm = { zone_name: '', notes: '', status: 'active' };

const ZoneDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreate = id === 'new' || !id;
  const [editing, setEditing] = useState(isCreate);
  const [formData, setFormData] = useState(emptyForm);
  const [managerForm, setManagerForm] = useState({ employee_id: '', assigned_date: '' });
  const [showManagerForm, setShowManagerForm] = useState(false);

  const zoneQuery = useQuery({
    queryKey: ['zone', id],
    queryFn: () => zoneService.getById(id),
    enabled: !isCreate,
  });

  const regionsQuery = useQuery({
    queryKey: ['regions', { zone_id: id }],
    queryFn: () => regionService.getAll({ zone_id: id }),
    enabled: !isCreate,
  });

  // Fetch zone manager candidates
  const managersQuery = useQuery({
    queryKey: ['employees', 'zone-managers'],
    queryFn: () => employeeService.getAll({ page: 1, page_size: 200, status_filter: 'active' }),
    enabled: showManagerForm,
  });
  const managerCandidates = (managersQuery.data?.data || []).filter(
    (e) => e.job_title === 'Zone Manager'
  );

  useEffect(() => {
    if (zoneQuery.data) setFormData(zoneQuery.data);
  }, [zoneQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (data) => (isCreate ? zoneService.create(data) : zoneService.update(id, data)),
    onSuccess: (zone) => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      queryClient.setQueryData(['zone', zone.id], zone);
      toast.success(isCreate ? 'Zone created' : 'Zone updated');
      if (isCreate) navigate(`/zones/${zone.id}`);
      else setEditing(false);
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to save zone')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => zoneService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('Zone deleted');
      navigate('/zones');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to delete zone')),
  });

  const assignManagerMutation = useMutation({
    mutationFn: (data) => zoneService.assignManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone', id] });
      setManagerForm({ employee_id: '', assigned_date: '' });
      setShowManagerForm(false);
      toast.success('Manager assigned');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to assign manager')),
  });

  const removeManagerMutation = useMutation({
    mutationFn: (managerId) => zoneService.removeManager(id, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone', id] });
      toast.success('Manager removed');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to remove manager')),
  });

  const zone = zoneQuery.data;
  const regions = regionsQuery.data || [];

  if (!isCreate && zoneQuery.isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }
  if (!isCreate && zoneQuery.isError) {
    return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(zoneQuery.error, 'Failed to load zone')}</CardContent></Card>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/zones"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isCreate ? 'New Zone' : zone?.zone_name}
              </h1>
              {!isCreate && zone && (
                <Badge variant="outline" className={zone.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>
                  {zone.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { if (isCreate) navigate('/zones'); else { setFormData(zone); setEditing(false); } }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{isCreate ? 'Create Zone' : 'Save Changes'}</>}
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

      {/* Zone Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Zone Information</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Zone Name *</Label>
                <Input value={formData.zone_name} onChange={(e) => setFormData((f) => ({ ...f, zone_name: e.target.value }))} placeholder="e.g. Northern Zone" />
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
              <div><dt className="text-sm font-medium text-slate-500">Zone Name</dt><dd className="mt-1 text-sm font-medium text-slate-900">{zone?.zone_name}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd className="mt-1"><Badge variant="outline" className={zone?.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>{zone?.status}</Badge></dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Regions</dt><dd className="mt-1 text-sm text-slate-900">{zone?.region_count ?? 0}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Total Employees</dt><dd className="mt-1 text-sm text-slate-900">{zone?.employee_count ?? 0}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Total Sites</dt><dd className="mt-1 text-sm text-slate-900">{zone?.site_count ?? 0}</dd></div>
              <div className="sm:col-span-2 lg:col-span-3"><dt className="text-sm font-medium text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900">{zone?.notes || '-'}</dd></div>
            </dl>
          )}
        </CardContent>
      </Card>

      {!isCreate && (
        <>
          {/* Managers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><UserCheck className="w-5 h-5" />Zone Managers</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowManagerForm((v) => !v)}>
                <Plus className="w-4 h-4 mr-1" />Assign Manager
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showManagerForm && (
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Employee (Zone Manager title required)</Label>
                    <Select value={managerForm.employee_id} onValueChange={(v) => setManagerForm((f) => ({ ...f, employee_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {managerCandidates.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</SelectItem>
                        ))}
                        {managerCandidates.length === 0 && <SelectItem disabled value="_none">No employees with 'Zone Manager' title</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Assigned Date</Label>
                    <Input type="date" value={managerForm.assigned_date} onChange={(e) => setManagerForm((f) => ({ ...f, assigned_date: e.target.value }))} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={() => assignManagerMutation.mutate(managerForm)} disabled={!managerForm.employee_id || !managerForm.assigned_date || assignManagerMutation.isPending} className="bg-[#0F172A] hover:bg-slate-800">
                      {assignManagerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowManagerForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {(zone?.managers || []).length === 0 ? (
                <p className="text-sm text-slate-500 italic">No managers assigned</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Name</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zone.managers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.employee_name}</TableCell>
                        <TableCell>{m.assigned_date}</TableCell>
                        <TableCell>{m.end_date || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>
                            {m.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeManagerMutation.mutate(m.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Regions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5" />Regions</CardTitle>
              <Link to={`/regions/new?zone_id=${id}`}>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Region</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {regionsQuery.isLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : regions.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No regions in this zone</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Region Name</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{r.region_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Users className="w-3.5 h-3.5" />{r.employee_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{r.site_count}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/regions/${r.id}`}>
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
        </>
      )}
    </div>
  );
};

export default ZoneDetail;

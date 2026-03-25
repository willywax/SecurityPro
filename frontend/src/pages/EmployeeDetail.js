import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/empty-state';
import { ArrowLeft, Camera, CreditCard, File, FileText, Heart, Loader2, Package, Plus, Save, Trash2, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import employeeService from '@/services/employeeService';
import regionService from '@/services/regionService';
import { API_BASE_URL } from '@/lib/api';
import { formatTZS } from '@/utils/currency';
import { formatApiError } from '@/utils/errors';
import { LabeledInputField, LabeledSelectField, LabeledTextareaField } from '@/components/forms/labeled-fields';
import { ID_TYPE_OPTIONS, RELATIONSHIP_OPTIONS } from '@/constants/contactOptions';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
  on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const TANZANIA_PHONE_REGEX = /^(\+255|0)[67]\d{8}$/;
const DEFAULT_REFEREE_FORM = { full_name: '', referee_relationship: '', phone_number: '', alternate_phone: '', id_type: '', id_number: '', occupation: '', address: '', notes: '' };
const DEFAULT_KIN_FORM = { full_name: '', kin_relationship: '', phone_1: '', phone_2: '', id_type: '', id_number: '', occupation: '', address: '', notes: '' };
const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS.map((option) => [option.value, option.label]));
const ID_TYPE_LABELS = Object.fromEntries(ID_TYPE_OPTIONS.map((option) => [option.value, option.label]));

const Section = ({ loading, items, emptyText, render }) => {
  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!items?.length) {
    return <Card><CardContent className="py-12 text-center text-slate-500">{emptyText}</CardContent></Card>;
  }
  return <div className="space-y-3">{items.map(render)}</div>;
};

const validateRefereeForm = (form) => {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'Full name is required';
  if (!form.referee_relationship) errors.referee_relationship = 'Relationship is required';
  if (!form.phone_number.trim()) errors.phone_number = 'Phone number is required';
  else if (!TANZANIA_PHONE_REGEX.test(form.phone_number.trim())) errors.phone_number = 'Use a valid Tanzanian phone number';
  if (form.alternate_phone && !TANZANIA_PHONE_REGEX.test(form.alternate_phone.trim())) errors.alternate_phone = 'Use a valid Tanzanian phone number';
  if (!form.id_type) errors.id_type = 'ID type is required';
  if (!form.id_number.trim()) errors.id_number = 'ID number is required';
  if (!form.occupation.trim()) errors.occupation = 'Occupation is required';
  if (!form.address.trim()) errors.address = 'Address is required';
  return errors;
};

const validateKinForm = (form) => {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'Full name is required';
  if (!form.kin_relationship) errors.kin_relationship = 'Relationship is required';
  if (!form.phone_1.trim()) errors.phone_1 = 'Phone number is required';
  else if (!TANZANIA_PHONE_REGEX.test(form.phone_1.trim())) errors.phone_1 = 'Use a valid Tanzanian phone number';
  if (form.phone_2 && !TANZANIA_PHONE_REGEX.test(form.phone_2.trim())) errors.phone_2 = 'Use a valid Tanzanian phone number';
  if (!form.id_type) errors.id_type = 'ID type is required';
  if (!form.id_number.trim()) errors.id_number = 'ID number is required';
  if (!form.occupation.trim()) errors.occupation = 'Occupation is required';
  if (!form.address.trim()) errors.address = 'Address is required';
  return errors;
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [bankForm, setBankForm] = useState({ bank_name: '', bank_branch: '', account_name: '', account_number: '' });
  const [refereeForm, setRefereeForm] = useState(DEFAULT_REFEREE_FORM);
  const [refereeErrors, setRefereeErrors] = useState({});
  const [kinForm, setKinForm] = useState(DEFAULT_KIN_FORM);
  const [kinErrors, setKinErrors] = useState({});
  const [contractForm, setContractForm] = useState({ contract_type: 'permanent', start_date: '', end_date: '', salary: '', allowances: '', status: 'draft', notes: '' });
  const [historyForm, setHistoryForm] = useState({ employer_name: '', job_title: '', start_date: '', end_date: '', reason_for_leaving: '', notes: '' });
  const [documentForm, setDocumentForm] = useState({ document_type: '', document_name: '', notes: '', file: null });

  const employeeQuery = useQuery({ queryKey: ['employee', id], queryFn: () => employeeService.getById(id) });
  const regionsQuery = useQuery({ queryKey: ['regions', 'employee-form'], queryFn: () => regionService.getAll({ status_filter: 'active' }) });
  const regions = Array.isArray(regionsQuery.data) ? regionsQuery.data : regionsQuery.data?.data || [];
  const regionPlaceholder = regionsQuery.isLoading
    ? 'Loading regions...'
    : regionsQuery.isError
      ? 'Failed to load regions'
      : regions.length === 0
        ? 'No active regions available'
        : 'Select region';
  const bankQuery = useQuery({ queryKey: ['employee', id, 'bank-accounts'], queryFn: () => employeeService.getBankAccounts(id), enabled: !!id });
  const refereesQuery = useQuery({ queryKey: ['employee', id, 'referees'], queryFn: () => employeeService.getReferees(id), enabled: !!id });
  const kinQuery = useQuery({ queryKey: ['employee', id, 'next-of-kin'], queryFn: () => employeeService.getNextOfKin(id), enabled: !!id });
  const contractsQuery = useQuery({ queryKey: ['employee', id, 'contracts'], queryFn: () => employeeService.getContracts(id), enabled: !!id });
  const historyQuery = useQuery({ queryKey: ['employee', id, 'employment-history'], queryFn: () => employeeService.getEmploymentHistory(id), enabled: !!id });
  const documentsQuery = useQuery({ queryKey: ['employee', id, 'documents'], queryFn: () => employeeService.getDocuments(id), enabled: !!id });

  useEffect(() => {
    if (employeeQuery.data) {
      setForm(employeeQuery.data);
    }
  }, [employeeQuery.data]);

  const refresh = (section) => {
    queryClient.invalidateQueries({ queryKey: ['employee', id] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    if (section) queryClient.invalidateQueries({ queryKey: ['employee', id, section] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload) => employeeService.update(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['employee', id], data);
      refresh();
      setEditing(false);
      toast.success('Employee updated');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to update employee')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => employeeService.delete(id),
    onSuccess: () => {
      refresh();
      toast.success('Employee deleted');
      navigate('/employees');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to delete employee')),
  });

  const uploadPhoto = useMutation({
    mutationFn: (file) => employeeService.uploadPhoto(id, file),
    onSuccess: (data) => {
      queryClient.setQueryData(['employee', id], data);
      refresh();
      toast.success('Photo uploaded');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to upload photo')),
  });

  const employee = employeeQuery.data;
  if (employeeQuery.isLoading || !form) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (employeeQuery.isError) return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(employeeQuery.error, 'Failed to load employee')}</CardContent></Card>;

  const avatarSrc = employee.profile_photo ? `${API_BASE_URL}${employee.profile_photo}` : null;
  const removeItem = async (promise, section, message) => {
    try {
      await promise;
      refresh(section);
      toast.success(message);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Action failed');
    }
  };

  const updateRefereeField = (field, value) => {
    setRefereeForm((current) => ({ ...current, [field]: value }));
    if (refereeErrors[field]) {
      setRefereeErrors((current) => ({ ...current, [field]: null }));
    }
  };

  const updateKinField = (field, value) => {
    setKinForm((current) => ({ ...current, [field]: value }));
    if (kinErrors[field]) {
      setKinErrors((current) => ({ ...current, [field]: null }));
    }
  };

  const submitReferee = async () => {
    const errors = validateRefereeForm(refereeForm);
    setRefereeErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the referee form errors');
      return;
    }

    try {
      await employeeService.addReferee(id, refereeForm);
      setRefereeForm(DEFAULT_REFEREE_FORM);
      setRefereeErrors({});
      refresh('referees');
      toast.success('Referee added');
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to add referee'));
    }
  };

  const submitNextOfKin = async () => {
    const errors = validateKinForm(kinForm);
    setKinErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the next of kin form errors');
      return;
    }

    try {
      await employeeService.addNextOfKin(id, kinForm);
      setKinForm(DEFAULT_KIN_FORM);
      setKinErrors({});
      refresh('next-of-kin');
      toast.success('Next of kin added');
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to add next of kin'));
    }
  };

  return (
    <div className="space-y-6" data-testid="employee-detail-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/employees"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarSrc ? <img src={avatarSrc} alt={employee.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" /> : <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-white text-xl font-semibold">{employee.full_name.slice(0, 1)}</div>}
              <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => event.target.files?.[0] && uploadPhoto.mutate(event.target.files[0])} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{employee.full_name}</h1>
                <Badge variant="outline" className={statusColors[employee.employment_status]}>{employee.employment_status}</Badge>
              </div>
              <p className="text-slate-500 text-sm">{employee.employee_id} {employee.guard_no && `· Guard #${employee.guard_no}`}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setForm(employee); setEditing(false); }}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate(form)} className="bg-[#0F172A] hover:bg-slate-800">{updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate()}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent p-0 h-auto flex-wrap">
          <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><FileText className="w-4 h-4 mr-2" />History</TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><CreditCard className="w-4 h-4 mr-2" />Bank</TabsTrigger>
          <TabsTrigger value="referees" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><Users className="w-4 h-4 mr-2" />Referees</TabsTrigger>
          <TabsTrigger value="nextofkin" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><Heart className="w-4 h-4 mr-2" />Next of Kin</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><FileText className="w-4 h-4 mr-2" />Contracts</TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><Package className="w-4 h-4 mr-2" />Assets</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><File className="w-4 h-4 mr-2" />Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Employee Profile</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input value={form.first_name || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Middle Name</Label><Input value={form.middle_name || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, middle_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={form.last_name || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone_1 || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, phone_1: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Status</Label><Input value={form.employment_status || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, employment_status: event.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Region</Label>
                {editing ? (
                  <Select value={form.region_id || ''} onValueChange={(value) => setForm((current) => ({ ...current, region_id: value || null }))}>
                    <SelectTrigger disabled={regionsQuery.isLoading || regionsQuery.isError || regions.length === 0}><SelectValue placeholder={regionPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No region</SelectItem>
                      {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.region_name} ({r.zone_name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-slate-900 py-2">
                    {employee.region_name || '-'}
                    {employee.zone_name && <span className="text-slate-400 text-xs ml-1">({employee.zone_name})</span>}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-3"><Label>Address</Label><Textarea value={form.physical_address || ''} disabled={!editing} onChange={(event) => setForm((current) => ({ ...current, physical_address: event.target.value }))} rows={2} /></div>
              <div><p className="text-sm font-medium text-slate-500">Date Joined</p><p className="mt-1 text-sm text-slate-900">{formatDate(employee.hire_date)}</p></div>
              <div><p className="text-sm font-medium text-slate-500">Date Left</p><p className="mt-1 text-sm text-slate-900">{formatDate(employee.termination_date)}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add History</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Employer" value={historyForm.employer_name} onChange={(event) => setHistoryForm((current) => ({ ...current, employer_name: event.target.value }))} />
              <Input placeholder="Job title" value={historyForm.job_title} onChange={(event) => setHistoryForm((current) => ({ ...current, job_title: event.target.value }))} />
              <Input type="date" value={historyForm.start_date} onChange={(event) => setHistoryForm((current) => ({ ...current, start_date: event.target.value }))} />
              <Input type="date" value={historyForm.end_date} onChange={(event) => setHistoryForm((current) => ({ ...current, end_date: event.target.value }))} />
              <Textarea className="md:col-span-2" placeholder="Notes" value={historyForm.notes} onChange={(event) => setHistoryForm((current) => ({ ...current, notes: event.target.value }))} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.addEmploymentHistory(id, historyForm).then(() => { setHistoryForm({ employer_name: '', job_title: '', start_date: '', end_date: '', reason_for_leaving: '', notes: '' }); refresh('employment-history'); toast.success('History added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add history')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={historyQuery.isLoading} items={historyQuery.data} emptyText="No employment history" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.position}</p><p className="text-slate-500">{item.employer}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteEmploymentHistory(id, item.id), 'employment-history', 'History deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="bank" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add Bank Account</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Bank name" value={bankForm.bank_name} onChange={(event) => setBankForm((current) => ({ ...current, bank_name: event.target.value }))} />
              <Input placeholder="Branch" value={bankForm.bank_branch} onChange={(event) => setBankForm((current) => ({ ...current, bank_branch: event.target.value }))} />
              <Input placeholder="Account name" value={bankForm.account_name} onChange={(event) => setBankForm((current) => ({ ...current, account_name: event.target.value }))} />
              <Input placeholder="Account number" value={bankForm.account_number} onChange={(event) => setBankForm((current) => ({ ...current, account_number: event.target.value }))} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.addBankAccount(id, bankForm).then(() => { setBankForm({ bank_name: '', bank_branch: '', account_name: '', account_number: '' }); refresh('bank-accounts'); toast.success('Bank account added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add bank account')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={bankQuery.isLoading} items={bankQuery.data} emptyText="No bank accounts" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.bank_name}</p><p className="text-slate-500">{item.account_name} · {item.account_number}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteBankAccount(id, item.id), 'bank-accounts', 'Bank account deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="referees" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add Referee</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInputField id="referee-full-name" label="Full Name" value={refereeForm.full_name} onChange={(value) => updateRefereeField('full_name', value)} placeholder="Enter full name" error={refereeErrors.full_name} required />
              <LabeledSelectField id="referee-relationship" label="Relationship" value={refereeForm.referee_relationship} onChange={(value) => updateRefereeField('referee_relationship', value)} placeholder="Select relationship" options={RELATIONSHIP_OPTIONS} error={refereeErrors.referee_relationship} required />
              <LabeledInputField id="referee-phone" label="Phone Number" value={refereeForm.phone_number} onChange={(value) => updateRefereeField('phone_number', value)} placeholder="07XXXXXXXX or +255XXXXXXXXX" error={refereeErrors.phone_number} required />
              <LabeledInputField id="referee-alt-phone" label="Alternate Phone" value={refereeForm.alternate_phone} onChange={(value) => updateRefereeField('alternate_phone', value)} placeholder="Optional alternate phone" error={refereeErrors.alternate_phone} />
              <LabeledSelectField id="referee-id-type" label="ID Type" value={refereeForm.id_type} onChange={(value) => updateRefereeField('id_type', value)} placeholder="Select ID type" options={ID_TYPE_OPTIONS} error={refereeErrors.id_type} required />
              <LabeledInputField id="referee-id-number" label="ID Number" value={refereeForm.id_number} onChange={(value) => updateRefereeField('id_number', value)} placeholder="Enter ID number" error={refereeErrors.id_number} required />
              <LabeledInputField id="referee-occupation" label="Occupation" value={refereeForm.occupation} onChange={(value) => updateRefereeField('occupation', value)} placeholder="Enter occupation" error={refereeErrors.occupation} required />
              <LabeledTextareaField id="referee-address" label="Address" value={refereeForm.address} onChange={(value) => updateRefereeField('address', value)} placeholder="Enter address" error={refereeErrors.address} required className="md:col-span-2" rows={2} />
              <LabeledTextareaField id="referee-notes" label="Notes" value={refereeForm.notes} onChange={(value) => updateRefereeField('notes', value)} placeholder="Optional notes" className="md:col-span-2" rows={3} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={submitReferee}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={refereesQuery.isLoading} items={refereesQuery.data} emptyText="No referees" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between gap-4"><div><p className="font-medium text-slate-900">{item.full_name}</p><p className="text-slate-500">{RELATIONSHIP_LABELS[item.referee_relationship] || item.referee_relationship} · {item.phone_number}</p><p className="text-sm text-slate-500">{ID_TYPE_LABELS[item.id_type] || item.id_type} · {item.id_number}</p><p className="text-sm text-slate-500">{item.occupation} · {item.address}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteReferee(id, item.id), 'referees', 'Referee deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="nextofkin" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add Next of Kin</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInputField id="kin-full-name" label="Full Name" value={kinForm.full_name} onChange={(value) => updateKinField('full_name', value)} placeholder="Enter full name" error={kinErrors.full_name} required />
              <LabeledSelectField id="kin-relationship" label="Relationship" value={kinForm.kin_relationship} onChange={(value) => updateKinField('kin_relationship', value)} placeholder="Select relationship" options={RELATIONSHIP_OPTIONS} error={kinErrors.kin_relationship} required />
              <LabeledInputField id="kin-phone-1" label="Phone Number" value={kinForm.phone_1} onChange={(value) => updateKinField('phone_1', value)} placeholder="07XXXXXXXX or +255XXXXXXXXX" error={kinErrors.phone_1} required />
              <LabeledInputField id="kin-phone-2" label="Alternate Phone" value={kinForm.phone_2} onChange={(value) => updateKinField('phone_2', value)} placeholder="Optional alternate phone" error={kinErrors.phone_2} />
              <LabeledSelectField id="kin-id-type" label="ID Type" value={kinForm.id_type} onChange={(value) => updateKinField('id_type', value)} placeholder="Select ID type" options={ID_TYPE_OPTIONS} error={kinErrors.id_type} required />
              <LabeledInputField id="kin-id-number" label="ID Number" value={kinForm.id_number} onChange={(value) => updateKinField('id_number', value)} placeholder="Enter ID number" error={kinErrors.id_number} required />
              <LabeledInputField id="kin-occupation" label="Occupation" value={kinForm.occupation} onChange={(value) => updateKinField('occupation', value)} placeholder="Enter occupation" error={kinErrors.occupation} required />
              <LabeledTextareaField id="kin-address" label="Address" value={kinForm.address} onChange={(value) => updateKinField('address', value)} placeholder="Enter address" error={kinErrors.address} required className="md:col-span-2" rows={2} />
              <LabeledTextareaField id="kin-notes" label="Notes" value={kinForm.notes} onChange={(value) => updateKinField('notes', value)} placeholder="Optional notes" className="md:col-span-2" rows={3} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={submitNextOfKin}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={kinQuery.isLoading} items={kinQuery.data} emptyText="No next of kin" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between gap-4"><div><p className="font-medium text-slate-900">{item.full_name}</p><p className="text-slate-500">{RELATIONSHIP_LABELS[item.kin_relationship] || item.kin_relationship} · {item.phone_1}</p><p className="text-sm text-slate-500">{ID_TYPE_LABELS[item.id_type] || item.id_type} · {item.id_number}</p><p className="text-sm text-slate-500">{item.occupation || '-'} · {item.address}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteNextOfKin(id, item.id), 'next-of-kin', 'Next of kin deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add Contract</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Contract type" value={contractForm.contract_type} onChange={(event) => setContractForm((current) => ({ ...current, contract_type: event.target.value }))} />
              <Input placeholder="Status" value={contractForm.status} onChange={(event) => setContractForm((current) => ({ ...current, status: event.target.value }))} />
              <Input type="date" value={contractForm.start_date} onChange={(event) => setContractForm((current) => ({ ...current, start_date: event.target.value }))} />
              <Input type="date" value={contractForm.end_date} onChange={(event) => setContractForm((current) => ({ ...current, end_date: event.target.value }))} />
              <Input type="number" placeholder="Salary" value={contractForm.salary} onChange={(event) => setContractForm((current) => ({ ...current, salary: event.target.value }))} />
              <Input type="number" placeholder="Allowances" value={contractForm.allowances} onChange={(event) => setContractForm((current) => ({ ...current, allowances: event.target.value }))} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.saveContract(id, contractForm).then(() => { setContractForm({ contract_type: 'permanent', start_date: '', end_date: '', salary: '', allowances: '', status: 'draft', notes: '' }); refresh('contracts'); toast.success('Contract added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add contract')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={contractsQuery.isLoading} items={contractsQuery.data} emptyText="No contracts" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.contract_type}</p><p className="text-slate-500">{item.status}</p><p className="text-slate-600">{formatTZS(item.salary)}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteContract(id, item.id), 'contracts', 'Contract deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <EmptyState text="Assets issued to employees are not exposed on the current backend employee endpoint yet." />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Upload Document</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Document type" value={documentForm.document_type} onChange={(event) => setDocumentForm((current) => ({ ...current, document_type: event.target.value }))} />
              <Input placeholder="Document name" value={documentForm.document_name} onChange={(event) => setDocumentForm((current) => ({ ...current, document_name: event.target.value }))} />
              <Textarea className="md:col-span-2" placeholder="Notes" value={documentForm.notes} onChange={(event) => setDocumentForm((current) => ({ ...current, notes: event.target.value }))} />
              <Input className="md:col-span-2" type="file" onChange={(event) => setDocumentForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.uploadDocument(id, documentForm).then(() => { setDocumentForm({ document_type: '', document_name: '', notes: '', file: null }); refresh('documents'); toast.success('Document uploaded'); }).catch(error => toast.error(formatApiError(error, 'Failed to upload document')))} disabled={!documentForm.file}><Plus className="w-4 h-4 mr-2" />Upload</Button></div>
            </CardContent>
          </Card>
          <Section loading={documentsQuery.isLoading} items={documentsQuery.data} emptyText="No documents" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.document_name}</p><p className="text-slate-500">{item.document_type}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteDocument(id, item.id), 'documents', 'Document deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;

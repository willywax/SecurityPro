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
import { API_BASE_URL } from '@/lib/api';
import { formatTZS } from '@/utils/currency';
import { formatApiError } from '@/utils/errors';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
  on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

const Section = ({ loading, items, emptyText, render }) => {
  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!items?.length) {
    return <Card><CardContent className="py-12 text-center text-slate-500">{emptyText}</CardContent></Card>;
  }
  return <div className="space-y-3">{items.map(render)}</div>;
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [bankForm, setBankForm] = useState({ bank_name: '', bank_branch: '', account_name: '', account_number: '' });
  const [refereeForm, setRefereeForm] = useState({ full_name: '', referee_relationship: '', phone_number: '', alternate_phone: '', id_type: '', id_number: '', address: '', occupation: '', notes: '' });
  const [kinForm, setKinForm] = useState({ full_name: '', kin_relationship: '', phone_1: '', phone_2: '', address: '', id_type: '', id_number: '', notes: '' });
  const [contractForm, setContractForm] = useState({ contract_type: 'permanent', start_date: '', end_date: '', salary: '', allowances: '', status: 'draft', notes: '' });
  const [historyForm, setHistoryForm] = useState({ employer_name: '', job_title: '', start_date: '', end_date: '', reason_for_leaving: '', notes: '' });
  const [documentForm, setDocumentForm] = useState({ document_type: '', document_name: '', notes: '', file: null });

  const employeeQuery = useQuery({ queryKey: ['employee', id], queryFn: () => employeeService.getById(id) });
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
              <Input placeholder="Full name" value={refereeForm.full_name} onChange={(event) => setRefereeForm((current) => ({ ...current, full_name: event.target.value }))} />
              <Input placeholder="Relationship" value={refereeForm.referee_relationship} onChange={(event) => setRefereeForm((current) => ({ ...current, referee_relationship: event.target.value }))} />
              <Input placeholder="Phone number" value={refereeForm.phone_number} onChange={(event) => setRefereeForm((current) => ({ ...current, phone_number: event.target.value }))} />
              <Input placeholder="Alternate phone" value={refereeForm.alternate_phone} onChange={(event) => setRefereeForm((current) => ({ ...current, alternate_phone: event.target.value }))} />
              <Select value={refereeForm.id_type} onValueChange={(value) => setRefereeForm((current) => ({ ...current, id_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="voter_id">Voter ID</SelectItem>
                  <SelectItem value="driving_license">Driving License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="ID number" value={refereeForm.id_number} onChange={(event) => setRefereeForm((current) => ({ ...current, id_number: event.target.value }))} />
              <Input placeholder="Occupation" value={refereeForm.occupation} onChange={(event) => setRefereeForm((current) => ({ ...current, occupation: event.target.value }))} />
              <div className="md:col-span-2"><Input placeholder="Address" value={refereeForm.address} onChange={(event) => setRefereeForm((current) => ({ ...current, address: event.target.value }))} /></div>
              <div className="md:col-span-2"><Textarea placeholder="Notes" value={refereeForm.notes} onChange={(event) => setRefereeForm((current) => ({ ...current, notes: event.target.value }))} /></div>
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.addReferee(id, refereeForm).then(() => { setRefereeForm({ full_name: '', referee_relationship: '', phone_number: '', alternate_phone: '', id_type: '', id_number: '', address: '', occupation: '', notes: '' }); refresh('referees'); toast.success('Referee added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add referee')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={refereesQuery.isLoading} items={refereesQuery.data} emptyText="No referees" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.full_name}</p><p className="text-slate-500">{item.referee_relationship} · {item.phone_number}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteReferee(id, item.id), 'referees', 'Referee deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="nextofkin" className="mt-6">
          <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add Next of Kin</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Full name" value={kinForm.full_name} onChange={(event) => setKinForm((current) => ({ ...current, full_name: event.target.value }))} />
              <Input placeholder="Relationship" value={kinForm.kin_relationship} onChange={(event) => setKinForm((current) => ({ ...current, kin_relationship: event.target.value }))} />
              <Input placeholder="Phone 1" value={kinForm.phone_1} onChange={(event) => setKinForm((current) => ({ ...current, phone_1: event.target.value }))} />
              <Input placeholder="Phone 2" value={kinForm.phone_2} onChange={(event) => setKinForm((current) => ({ ...current, phone_2: event.target.value }))} />
              <Select value={kinForm.id_type} onValueChange={(value) => setKinForm((current) => ({ ...current, id_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="voter_id">Voter ID</SelectItem>
                  <SelectItem value="driving_license">Driving License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="ID number" value={kinForm.id_number} onChange={(event) => setKinForm((current) => ({ ...current, id_number: event.target.value }))} />
              <div className="md:col-span-2"><Input placeholder="Address" value={kinForm.address} onChange={(event) => setKinForm((current) => ({ ...current, address: event.target.value }))} /></div>
              <div className="md:col-span-2"><Textarea placeholder="Notes" value={kinForm.notes} onChange={(event) => setKinForm((current) => ({ ...current, notes: event.target.value }))} /></div>
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.addNextOfKin(id, kinForm).then(() => { setKinForm({ full_name: '', kin_relationship: '', phone_1: '', phone_2: '', address: '', id_type: '', id_number: '', notes: '' }); refresh('next-of-kin'); toast.success('Next of kin added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add next of kin')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>
          <Section loading={kinQuery.isLoading} items={kinQuery.data} emptyText="No next of kin" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.full_name}</p><p className="text-slate-500">{item.kin_relationship} · {item.phone_1}</p></div><Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteNextOfKin(id, item.id), 'next-of-kin', 'Next of kin deleted')}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>
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

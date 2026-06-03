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
import { AlertTriangle, ArrowLeft, ArrowRightLeft, Camera, CheckCircle, CreditCard, Download, Eye, File, FileText, Heart, Loader2, MapPin, Package, Printer, Plus, Save, Trash2, Upload, User, Users, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import employeeService from '@/services/employeeService';
import allocationService from '@/services/allocationService';
import storageService from '@/services/storageService';
import regionService from '@/services/regionService';
import { API_BASE_URL } from '@/lib/api';
import { formatTZS } from '@/utils/currency';
import { formatApiError } from '@/utils/errors';
import { formatFileSize } from '@/utils/fileSize';
import { LabeledInputField, LabeledSelectField, LabeledTextareaField } from '@/components/forms/labeled-fields';
import { ID_TYPE_OPTIONS, RELATIONSHIP_OPTIONS } from '@/constants/contactOptions';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
  on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
  resigned: 'bg-slate-100 text-slate-600 border-slate-200',
  absconded: 'bg-orange-100 text-orange-700 border-orange-200',
  rehired: 'bg-blue-100 text-blue-700 border-blue-200',
};

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
  on_leave: 'On Leave',
  resigned: 'Resigned',
  absconded: 'Absconded',
  rehired: 'Rehired',
};

const DEPARTURE_REASON_OPTIONS = [
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'contract_expired', label: 'Contract Expired' },
  { value: 'absconded', label: 'Absconded' },
  { value: 'other', label: 'Other' },
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const TANZANIA_PHONE_REGEX = /^(\+255|0)[67]\d{8}$/;
const NO_REGION_VALUE = 'no_region';
const DEFAULT_REFEREE_FORM = { full_name: '', referee_relationship: '', phone_number: '', alternate_phone: '', id_type: '', id_number: '', occupation: '', address: '', notes: '' };
const DEFAULT_KIN_FORM = { full_name: '', kin_relationship: '', phone_1: '', phone_2: '', id_type: '', id_number: '', occupation: '', address: '', notes: '' };
const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS.map((option) => [option.value, option.label]));
const ID_TYPE_LABELS = Object.fromEntries(ID_TYPE_OPTIONS.map((option) => [option.value, option.label]));
const resolveMediaUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

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
  const DEFAULT_CONTRACT_FORM = { start_date: '', duration_months: '3', salary_amount: '', job_title_on_contract: '', workstation_site: '', probation_months: '', signed_date: '', employee_signed: false, employer_signed: false, notes: '' };
  const [showContractForm, setShowContractForm] = useState(false);
  const [renewingContractId, setRenewingContractId] = useState(null);
  const [contractForm, setContractForm] = useState(DEFAULT_CONTRACT_FORM);
  const [contractFormSaving, setContractFormSaving] = useState(false);
  const [editingContractId, setEditingContractId] = useState(null);
  const [contractEditForm, setContractEditForm] = useState({ salary_amount: '', notes: '' });
  const [contractEditSaving, setContractEditSaving] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState(null);
  const [terminateForm, setTerminateForm] = useState({ termination_type: 'terminated', termination_reason: '', termination_date: '' });
  const [terminateSaving, setTerminateSaving] = useState(false);
  const [historyForm, setHistoryForm] = useState({ employer_name: '', job_title: '', start_date: '', end_date: '', reason_for_leaving: '', notes: '' });
  const [documentForm, setDocumentForm] = useState({ document_type: '', document_name: '', notes: '', file: null });
  // GCS document state
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, document_type: '', title: '', notes: '' });
  const [uploadErrors, setUploadErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(false);
  // GCS photo state
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  // Offboard / rehire modals
  const [showOffboardModal, setShowOffboardModal] = useState(false);
  const [offboardForm, setOffboardForm] = useState({ departure_reason: '', last_working_date: '', departure_notes: '', end_active_contract: true });
  const [showRehireModal, setShowRehireModal] = useState(false);
  const [rehireForm, setRehireForm] = useState({ rehire_date: '', notes: '' });

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
  const issuedAssetsQuery = useQuery({ queryKey: ['employee', id, 'issued-assets'], queryFn: () => employeeService.getIssuedAssets(id), enabled: !!id });
  const contractsQuery = useQuery({ queryKey: ['employee', id, 'contracts'], queryFn: () => employeeService.getContracts(id), enabled: !!id });
  const historyQuery = useQuery({ queryKey: ['employee', id, 'employment-history'], queryFn: () => employeeService.getEmploymentHistory(id), enabled: !!id });
  const documentsQuery = useQuery({
    queryKey: ['employee', id, 'documents'],
    queryFn: () => storageService.getEmployeeDocuments(id),
    enabled: !!id,
  });
  const periodsQuery = useQuery({
    queryKey: ['employee', id, 'employment-periods'],
    queryFn: () => employeeService.getEmploymentPeriods(id),
    enabled: !!id,
  });
  const allocationHistoryQuery = useQuery({
    queryKey: ['employee', id, 'allocation-history'],
    queryFn: () => allocationService.getEmployeeAllocationHistory(id),
    enabled: !!id,
  });
  const transferHistoryQuery = useQuery({
    queryKey: ['employee', id, 'transfer-history'],
    queryFn: () => allocationService.getEmployeeTransfers(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (employeeQuery.data) {
      if (!editing) {
        setForm(employeeQuery.data);
      }
      if (employeeQuery.data.photo_url) {
        setPhotoUrl(employeeQuery.data.photo_url);
        return;
      }
      // Load GCS photo URL if employee has a photo_path
      if (employeeQuery.data.photo_path && !photoUrl) {
        setPhotoLoading(true);
        storageService.getEmployeePhoto(id)
          .then(r => setPhotoUrl(r.photo_url))
          .catch(() => {})
          .finally(() => setPhotoLoading(false));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    mutationFn: (file) => storageService.uploadEmployeePhoto(id, file),
    onSuccess: (data) => {
      setPhotoUrl(data.photo_url);
      refresh();
      toast.success('Photo uploaded');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to upload photo')),
  });

  const offboardMutation = useMutation({
    mutationFn: (payload) => employeeService.offboard(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['employee', id], data);
      queryClient.invalidateQueries({ queryKey: ['employee', id, 'employment-periods'] });
      refresh();
      setShowOffboardModal(false);
      setOffboardForm({ departure_reason: '', last_working_date: '', departure_notes: '', end_active_contract: true });
      toast.success('Employee offboarded');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to offboard employee')),
  });

  const rehireMutation = useMutation({
    mutationFn: (payload) => employeeService.rehire(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['employee', id], data);
      queryClient.invalidateQueries({ queryKey: ['employee', id, 'employment-periods'] });
      refresh();
      setShowRehireModal(false);
      setRehireForm({ rehire_date: '', notes: '' });
      toast.success('Employee rehired');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to rehire employee')),
  });

  const deletePhoto = useMutation({
    mutationFn: () => storageService.deleteEmployeePhoto(id),
    onSuccess: () => {
      setPhotoUrl(null);
      setShowPhotoModal(false);
      refresh();
      toast.success('Photo removed');
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to remove photo')),
  });

  const handleRefreshPhoto = async () => {
    if (!employee?.photo_path) return;
    try {
      setPhotoLoading(true);
      const r = await storageService.getEmployeePhoto(id);
      if (r.photo_url) setPhotoUrl(r.photo_url);
    } catch (_) {
    } finally {
      setPhotoLoading(false);
    }
  };

  const employee = employeeQuery.data;
  if (employeeQuery.isLoading || !form) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (employeeQuery.isError) return <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(employeeQuery.error, 'Failed to load employee')}</CardContent></Card>;

  const avatarSrc = resolveMediaUrl(photoUrl || employee.profile_photo);
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

  // Compute end_date from start_date + duration_months
  const computeContractEndDate = (startDate, durationMonths) => {
    if (!startDate || !durationMonths) return '';
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + parseInt(durationMonths, 10));
    return d.toISOString().split('T')[0];
  };

  const submitContractForm = async () => {
    if (!contractForm.start_date || !contractForm.duration_months || !contractForm.salary_amount) {
      toast.error('Start date, duration, and salary are required');
      return;
    }
    setContractFormSaving(true);
    try {
      if (renewingContractId) {
        await employeeService.renewContract(renewingContractId, contractForm);
        toast.success('Contract renewed successfully');
      } else {
        const result = await employeeService.createContract(id, contractForm);
        if (result?.warning) toast.info(result.warning);
        else toast.success('Contract created successfully');
      }
      setShowContractForm(false);
      setRenewingContractId(null);
      setContractForm(DEFAULT_CONTRACT_FORM);
      refresh('contracts');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to save contract'));
    } finally {
      setContractFormSaving(false);
    }
  };

  const submitContractEdit = async () => {
    setContractEditSaving(true);
    try {
      await employeeService.patchContract(editingContractId, {
        salary_amount: contractEditForm.salary_amount ? parseFloat(contractEditForm.salary_amount) : undefined,
        notes: contractEditForm.notes || null,
      });
      setEditingContractId(null);
      refresh('contracts');
      toast.success('Contract updated');
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to update contract'));
    } finally {
      setContractEditSaving(false);
    }
  };

  const submitTerminate = async () => {
    if (!terminateForm.termination_reason || terminateForm.termination_reason.trim().length < 20) {
      toast.error('Termination reason must be at least 20 characters');
      return;
    }
    setTerminateSaving(true);
    try {
      await employeeService.terminateContract(terminateTarget.id, {
        termination_type: terminateForm.termination_type,
        termination_reason: terminateForm.termination_reason,
        termination_date: terminateForm.termination_date || undefined,
      });
      setTerminateTarget(null);
      setTerminateForm({ termination_type: 'terminated', termination_reason: '', termination_date: '' });
      refresh('contracts');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Contract terminated');
    } catch (error) {
      toast.error(formatApiError(error, 'Failed to terminate contract'));
    } finally {
      setTerminateSaving(false);
    }
  };

  const openRenew = (contract) => {
    setRenewingContractId(contract.id);
    setContractForm({
      start_date: new Date().toISOString().split('T')[0],
      duration_months: String(contract.duration_months || '3'),
      salary_amount: String(contract.salary_amount || ''),
      job_title_on_contract: contract.job_title_on_contract || '',
      workstation_site: contract.workstation_site || '',
      probation_months: String(contract.probation_months || ''),
      signed_date: '',
      employee_signed: false,
      employer_signed: false,
      notes: '',
    });
    setShowContractForm(true);
  };

  const contractStatusColors = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    expired: 'bg-slate-100 text-slate-600 border-slate-200',
    terminated: 'bg-red-100 text-red-700 border-red-200',
    mutual_termination: 'bg-orange-100 text-orange-700 border-orange-200',
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const contracts = contractsQuery.data || [];
  const activeContract = contracts.find(c => c.status === 'active');
  const historyContracts = contracts.filter(c => c.status !== 'active');

  return (
    <div className="space-y-6" data-testid="employee-detail-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/employees"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarSrc ? (
                <button type="button" onClick={() => setShowPhotoModal(true)} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
                  <img
                    src={avatarSrc}
                    alt={employee.full_name}
                    className="w-28 h-28 rounded-lg object-cover border border-slate-200 bg-slate-50"
                    onError={handleRefreshPhoto}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-lg flex items-center justify-center text-white text-3xl font-semibold select-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                  style={{ backgroundColor: `hsl(${[...employee.full_name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 55%, 42%)` }}
                >
                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                </button>
              )}
              {(uploadPhoto.isPending || photoLoading) && (
                <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              {!uploadPhoto.isPending && !photoLoading && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 h-9 w-9 rounded-md bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadPhoto.mutate(file);
                  event.target.value = '';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{employee.full_name}</h1>
                <Badge variant="outline" className={statusColors[employee.employment_status]}>{statusLabels[employee.employment_status] || employee.employment_status}</Badge>
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
              {['active', 'rehired'].includes(employee.employment_status) && (
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setShowOffboardModal(true)}>
                  <XCircle className="w-4 h-4 mr-2" />Offboard
                </Button>
              )}
              {['resigned', 'terminated', 'absconded', 'inactive'].includes(employee.employment_status) && (
                <Button variant="outline" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" onClick={() => setShowRehireModal(true)}>
                  <CheckCircle className="w-4 h-4 mr-2" />Rehire
                </Button>
              )}
              <Button variant="outline" onClick={() => { setForm(employee); setEditing(true); }}>Edit</Button>
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
          <TabsTrigger value="allocation" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"><MapPin className="w-4 h-4 mr-2" />Allocation</TabsTrigger>
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
                  <Select value={form.region_id || NO_REGION_VALUE} onValueChange={(value) => setForm((current) => ({ ...current, region_id: value === NO_REGION_VALUE ? null : value }))}>
                    <SelectTrigger disabled={regionsQuery.isLoading || regionsQuery.isError || regions.length === 0}><SelectValue placeholder={regionPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_REGION_VALUE}>No region</SelectItem>
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

        <TabsContent value="history" className="mt-6 space-y-6">
          {/* Employment periods timeline */}
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Employment Periods</h3>
            {periodsQuery.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : !periodsQuery.data?.length ? (
              <Card><CardContent className="py-6 text-center text-slate-500 text-sm">No employment periods recorded</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {periodsQuery.data.map((period) => {
                  const durationDays = period.end_date
                    ? Math.round((new Date(period.end_date) - new Date(period.start_date)) / 86400000)
                    : Math.round((new Date() - new Date(period.start_date)) / 86400000);
                  return (
                    <Card key={period.id} className={period.status === 'active' ? 'border-emerald-200' : ''}>
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">#{period.period_number}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {formatDate(period.start_date)} — {period.end_date ? formatDate(period.end_date) : <span className="text-emerald-600">Present</span>}
                            </p>
                            <p className="text-xs text-slate-500">{durationDays} day{durationDays !== 1 ? 's' : ''}{period.departure_reason && ` · Left: ${DEPARTURE_REASON_OPTIONS.find(o => o.value === period.departure_reason)?.label || period.departure_reason}`}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={period.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                          {period.status === 'active' ? 'Active' : 'Ended'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Previous Employer History</h3>
          {editing && <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add History</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Employer" value={historyForm.employer_name} onChange={(event) => setHistoryForm((current) => ({ ...current, employer_name: event.target.value }))} />
              <Input placeholder="Job title" value={historyForm.job_title} onChange={(event) => setHistoryForm((current) => ({ ...current, job_title: event.target.value }))} />
              <Input type="date" value={historyForm.start_date} onChange={(event) => setHistoryForm((current) => ({ ...current, start_date: event.target.value }))} />
              <Input type="date" value={historyForm.end_date} onChange={(event) => setHistoryForm((current) => ({ ...current, end_date: event.target.value }))} />
              <Textarea className="md:col-span-2" placeholder="Notes" value={historyForm.notes} onChange={(event) => setHistoryForm((current) => ({ ...current, notes: event.target.value }))} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.addEmploymentHistory(id, historyForm).then(() => { setHistoryForm({ employer_name: '', job_title: '', start_date: '', end_date: '', reason_for_leaving: '', notes: '' }); refresh('employment-history'); toast.success('History added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add history')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>}
          <Section loading={historyQuery.isLoading} items={historyQuery.data} emptyText="No employment history" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.position}</p><p className="text-slate-500">{item.employer}</p></div>{editing && <Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteEmploymentHistory(id, item.id), 'employment-history', 'History deleted')}><Trash2 className="w-4 h-4" /></Button>}</CardContent></Card>
          )} />
          </div>
        </TabsContent>

        <TabsContent value="bank" className="mt-6">
          {editing && <Card className="mb-4">
            <CardHeader><CardTitle className="text-lg">Add Bank Account</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Bank name" value={bankForm.bank_name} onChange={(event) => setBankForm((current) => ({ ...current, bank_name: event.target.value }))} />
              <Input placeholder="Branch" value={bankForm.bank_branch} onChange={(event) => setBankForm((current) => ({ ...current, bank_branch: event.target.value }))} />
              <Input placeholder="Account name" value={bankForm.account_name} onChange={(event) => setBankForm((current) => ({ ...current, account_name: event.target.value }))} />
              <Input placeholder="Account number" value={bankForm.account_number} onChange={(event) => setBankForm((current) => ({ ...current, account_number: event.target.value }))} />
              <div className="md:col-span-2 flex justify-end"><Button onClick={() => employeeService.addBankAccount(id, bankForm).then(() => { setBankForm({ bank_name: '', bank_branch: '', account_name: '', account_number: '' }); refresh('bank-accounts'); toast.success('Bank account added'); }).catch(error => toast.error(formatApiError(error, 'Failed to add bank account')))}><Plus className="w-4 h-4 mr-2" />Add</Button></div>
            </CardContent>
          </Card>}
          <Section loading={bankQuery.isLoading} items={bankQuery.data} emptyText="No bank accounts" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between"><div><p className="font-medium text-slate-900">{item.bank_name}</p><p className="text-slate-500">{item.account_name} · {item.account_number}</p></div>{editing && <Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteBankAccount(id, item.id), 'bank-accounts', 'Bank account deleted')}><Trash2 className="w-4 h-4" /></Button>}</CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="referees" className="mt-6">
          {editing && <Card className="mb-4">
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
          </Card>}
          <Section loading={refereesQuery.isLoading} items={refereesQuery.data} emptyText="No referees" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between gap-4"><div><p className="font-medium text-slate-900">{item.full_name}</p><p className="text-slate-500">{RELATIONSHIP_LABELS[item.referee_relationship] || item.referee_relationship} · {item.phone_number}</p><p className="text-sm text-slate-500">{ID_TYPE_LABELS[item.id_type] || item.id_type} · {item.id_number}</p><p className="text-sm text-slate-500">{item.occupation} · {item.address}</p></div>{editing && <Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteReferee(id, item.id), 'referees', 'Referee deleted')}><Trash2 className="w-4 h-4" /></Button>}</CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="nextofkin" className="mt-6">
          {editing && <Card className="mb-4">
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
          </Card>}
          <Section loading={kinQuery.isLoading} items={kinQuery.data} emptyText="No next of kin" render={(item) => (
            <Card key={item.id}><CardContent className="p-4 flex items-start justify-between gap-4"><div><p className="font-medium text-slate-900">{item.full_name}</p><p className="text-slate-500">{RELATIONSHIP_LABELS[item.kin_relationship] || item.kin_relationship} · {item.phone_1}</p><p className="text-sm text-slate-500">{ID_TYPE_LABELS[item.id_type] || item.id_type} · {item.id_number}</p><p className="text-sm text-slate-500">{item.occupation || '-'} · {item.address}</p></div>{editing && <Button variant="outline" size="sm" onClick={() => removeItem(employeeService.deleteNextOfKin(id, item.id), 'next-of-kin', 'Next of kin deleted')}><Trash2 className="w-4 h-4" /></Button>}</CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-6 space-y-4">
          {employee.employment_status === 'rehired' && !contractsQuery.data?.some(c => c.status === 'active') && (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">This employee has been rehired. Please create a new contract to set their active employment terms.</p>
            </div>
          )}
          {/* Terminate Modal */}
          {terminateTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <Card className="w-full max-w-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-red-600">Terminate Contract</CardTitle>
                    <button onClick={() => setTerminateTarget(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500">Contract {terminateTarget.contract_number}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    This will set the employee status to Terminated.
                  </div>
                  <div className="space-y-2">
                    <Label>Termination Type</Label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="term_type" value="terminated" checked={terminateForm.termination_type === 'terminated'} onChange={e => setTerminateForm(f => ({ ...f, termination_type: e.target.value }))} />
                        <span className="text-sm">Employer Termination</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="term_type" value="mutual_termination" checked={terminateForm.termination_type === 'mutual_termination'} onChange={e => setTerminateForm(f => ({ ...f, termination_type: e.target.value }))} />
                        <span className="text-sm">Mutual Termination</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason <span className="text-red-500">*</span> <span className="text-slate-400 text-xs">({terminateForm.termination_reason.length}/20 min)</span></Label>
                    <Textarea value={terminateForm.termination_reason} onChange={e => setTerminateForm(f => ({ ...f, termination_reason: e.target.value }))} placeholder="Describe the reason for termination (minimum 20 characters)" rows={3} className={terminateForm.termination_reason.length > 0 && terminateForm.termination_reason.length < 20 ? 'border-red-400' : ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Termination Date</Label>
                    <Input type="date" value={terminateForm.termination_date || new Date().toISOString().split('T')[0]} onChange={e => setTerminateForm(f => ({ ...f, termination_date: e.target.value }))} />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => setTerminateTarget(null)}>Cancel</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submitTerminate} disabled={terminateSaving}>
                      {terminateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" />Terminate Contract</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active Contract */}
          {contractsQuery.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : activeContract ? (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{activeContract.contract_number}</span>
                        <Badge className={contractStatusColors[activeContract.status]}>Active</Badge>
                        <span className="text-sm text-slate-500">{activeContract.duration_months} months</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {formatDate(activeContract.start_date)} → <span className="font-medium text-slate-800">Contract ends: {activeContract.end_date ? new Date(activeContract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {editingContractId === activeContract.id ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditingContractId(null)}>Cancel</Button>
                        <Button size="sm" className="bg-[#0F172A] hover:bg-slate-800" onClick={submitContractEdit} disabled={contractEditSaving}>
                          {contractEditSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditingContractId(activeContract.id); setContractEditForm({ salary_amount: String(activeContract.salary_amount || ''), notes: activeContract.notes || '' }); }}>Edit</Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setTerminateTarget(activeContract)}>Terminate</Button>
                      </>
                    )}
                  </div>
                </div>

                {editingContractId === activeContract.id ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-emerald-200">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Salary Amount (TZS)</Label>
                      <Input type="number" value={contractEditForm.salary_amount} onChange={e => setContractEditForm(f => ({ ...f, salary_amount: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Notes</Label>
                      <Input value={contractEditForm.notes} onChange={e => setContractEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200">
                    <div><p className="text-xs text-slate-500">Salary</p><p className="text-sm font-semibold text-slate-900">{formatTZS(activeContract.salary_amount)}</p></div>
                    {activeContract.job_title_on_contract && <div><p className="text-xs text-slate-500">Job Title</p><p className="text-sm text-slate-900">{activeContract.job_title_on_contract}</p></div>}
                    {activeContract.workstation_site && <div><p className="text-xs text-slate-500">Workstation</p><p className="text-sm text-slate-900">{activeContract.workstation_site}</p></div>}
                    {activeContract.probation_months && <div><p className="text-xs text-slate-500">Probation</p><p className="text-sm text-slate-900">{activeContract.probation_months} months</p></div>}
                    {activeContract.signed_date && <div><p className="text-xs text-slate-500">Signed</p><p className="text-sm text-slate-900">{formatDate(activeContract.signed_date)}</p></div>}
                    <div><p className="text-xs text-slate-500">Signatures</p><p className="text-sm text-slate-900">{activeContract.employee_signed ? '✓ Employee' : '–'} · {activeContract.employer_signed ? '✓ Employer' : '–'}</p></div>
                    {activeContract.notes && <div className="col-span-2"><p className="text-xs text-slate-500">Notes</p><p className="text-sm text-slate-900">{activeContract.notes}</p></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">No active contract. Payroll cannot be approved without an active contract.</p>
              </CardContent>
            </Card>
          )}

          {/* New / Renew Contract Form */}
          {!showContractForm ? (
            <Button variant="outline" onClick={() => { setShowContractForm(true); setRenewingContractId(null); setContractForm(DEFAULT_CONTRACT_FORM); }} className="w-full">
              <Plus className="w-4 h-4 mr-2" />New Contract
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{renewingContractId ? 'Renew Contract' : 'New Contract'}</CardTitle>
                  <button onClick={() => { setShowContractForm(false); setRenewingContractId(null); setContractForm(DEFAULT_CONTRACT_FORM); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeContract && !renewingContractId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Employee has an active contract ending {activeContract.end_date ? new Date(activeContract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}. Saving this contract will automatically expire it.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Start Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Duration <span className="text-red-500">*</span></Label>
                    <Select value={contractForm.duration_months} onValueChange={v => setContractForm(f => ({ ...f, duration_months: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-500">End Date (auto-calculated)</Label>
                    <div className="flex h-9 items-center px-3 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                      {contractForm.start_date && contractForm.duration_months
                        ? (() => { const d = computeContractEndDate(contractForm.start_date, contractForm.duration_months); return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; })()
                        : 'Select start date and duration'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Salary Amount (TZS) <span className="text-red-500">*</span></Label>
                    <Input type="number" min="0" value={contractForm.salary_amount} onChange={e => setContractForm(f => ({ ...f, salary_amount: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Job Title on Contract</Label>
                    <Input value={contractForm.job_title_on_contract} onChange={e => setContractForm(f => ({ ...f, job_title_on_contract: e.target.value }))} placeholder="e.g. Security Guard" />
                  </div>
                  <div className="space-y-1">
                    <Label>Workstation / Site</Label>
                    <Input value={contractForm.workstation_site} onChange={e => setContractForm(f => ({ ...f, workstation_site: e.target.value }))} placeholder="e.g. CBD Branch" />
                  </div>
                  <div className="space-y-1">
                    <Label>Probation Months</Label>
                    <Input type="number" min="0" value={contractForm.probation_months} onChange={e => setContractForm(f => ({ ...f, probation_months: e.target.value }))} placeholder="e.g. 1" />
                  </div>
                  <div className="space-y-1">
                    <Label>Signed Date</Label>
                    <Input type="date" value={contractForm.signed_date} onChange={e => setContractForm(f => ({ ...f, signed_date: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-6 md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={contractForm.employee_signed} onChange={e => setContractForm(f => ({ ...f, employee_signed: e.target.checked }))} className="w-4 h-4" />
                      <span className="text-sm">Employee Signed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={contractForm.employer_signed} onChange={e => setContractForm(f => ({ ...f, employer_signed: e.target.checked }))} className="w-4 h-4" />
                      <span className="text-sm">Employer Signed</span>
                    </label>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" rows={2} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setShowContractForm(false); setRenewingContractId(null); setContractForm(DEFAULT_CONTRACT_FORM); }}>Cancel</Button>
                  <Button className="bg-[#0F172A] hover:bg-slate-800" onClick={submitContractForm} disabled={contractFormSaving}>
                    {contractFormSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />{renewingContractId ? 'Renew Contract' : 'Save Contract'}</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contract History */}
          {historyContracts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide px-1">Contract History</h3>
              {historyContracts.map(contract => (
                <Card key={contract.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{contract.contract_number}</span>
                          <Badge variant="outline" className={contractStatusColors[contract.status] || 'bg-slate-100 text-slate-600'}>
                            {contract.status === 'mutual_termination' ? 'Mutual Termination' : contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                          </Badge>
                          {contract.auto_expired && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Auto-expired</span>}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{contract.duration_months} months · {formatDate(contract.start_date)} – {formatDate(contract.end_date)}</p>
                        <p className="text-sm text-slate-600">{formatTZS(contract.salary_amount)}{contract.job_title_on_contract ? ` · ${contract.job_title_on_contract}` : ''}</p>
                        {contract.termination_reason && (
                          <p className="text-xs text-slate-500 mt-1 italic">Reason: {contract.termination_reason}</p>
                        )}
                        {contract.termination_date && (
                          <p className="text-xs text-slate-500">Terminated: {formatDate(contract.termination_date)}</p>
                        )}
                      </div>
                      {['expired', 'terminated', 'mutual_termination'].includes(contract.status) && !showContractForm && (
                        <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => openRenew(contract)}>Renew</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!contractsQuery.isLoading && contracts.length === 0 && (
            <Card><CardContent className="py-12 text-center text-slate-500">No contracts yet. Click "New Contract" to add one.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          {issuedAssetsQuery.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : issuedAssetsQuery.isError ? (
            <Card><CardContent className="py-12 text-center text-red-600">{formatApiError(issuedAssetsQuery.error, 'Failed to load issued assets')}</CardContent></Card>
          ) : !issuedAssetsQuery.data?.length ? (
            <EmptyState text="No inventory assets have been issued to this employee yet." />
          ) : (
            <div className="space-y-3">
              {issuedAssetsQuery.data.map((asset) => (
                <Card key={asset.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{asset.item_name || 'Unknown item'}</p>
                        <Badge variant="outline" className={asset.status === 'active' || asset.status === 'partially_returned' ? 'bg-blue-100 text-blue-700 border-blue-200' : asset.status === 'lost' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                          {asset.status.replaceAll('_', ' ')}
                        </Badge>
                        {asset.is_overdue && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Overdue</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{asset.asset_type_name || 'Uncategorized asset'}</p>
                      <p className="text-sm text-slate-600">
                        Issued: {asset.quantity_issued} · Returned: {asset.quantity_returned} · Outstanding: {asset.outstanding_quantity}
                      </p>
                      <p className="text-sm text-slate-600">
                        Issue date: {formatDate(asset.issue_date)}
                        {asset.expected_return_date ? ` · Expected return: ${formatDate(asset.expected_return_date)}` : ''}
                        {asset.actual_return_date ? ` · Actual return: ${formatDate(asset.actual_return_date)}` : ''}
                      </p>
                      <p className="text-sm text-slate-600">
                        Condition: {asset.issue_condition}
                        {asset.return_condition ? ` · Return condition: ${asset.return_condition}` : ''}
                      </p>
                      {asset.notes && <p className="text-sm text-slate-500">{asset.notes}</p>}
                    </div>
                    <div className="text-sm text-slate-500 sm:text-right">
                      <p>Issuance ID</p>
                      <p className="font-mono text-xs break-all">{asset.id}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {/* Documents header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
              {documentsQuery.data?.length > 0 && (
                <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 font-medium">{documentsQuery.data.length}</span>
              )}
            </div>
            <Button className="bg-[#0F172A] hover:bg-slate-800" onClick={() => { setUploadForm({ file: null, document_type: '', title: '', notes: '' }); setUploadErrors({}); setShowUploadModal(true); }}>
              <Upload className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </div>

          {/* Document type filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4 border-b pb-3">
            {[
              { key: 'all', label: 'All' },
              { key: 'national_id', label: 'National ID' },
              { key: 'referee_id', label: 'Referee ID' },
              { key: 'next_of_kin_id', label: 'Next of Kin' },
              { key: 'contract', label: 'Contract' },
              { key: 'certificate', label: 'Certificate' },
              { key: 'disciplinary_letter', label: 'Disciplinary' },
              { key: 'other', label: 'Other' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDocTypeFilter(key)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${docTypeFilter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Document list */}
          {documentsQuery.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : documentsQuery.isError ? (
            <Card><CardContent className="py-12 text-center text-red-600">Failed to load documents</CardContent></Card>
          ) : (() => {
            const docs = (documentsQuery.data || []).filter(d => docTypeFilter === 'all' || d.document_type === docTypeFilter);
            if (docs.length === 0) return (
              <Card><CardContent className="py-12 text-center">
                <File className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No documents uploaded yet</p>
                <Button className="bg-[#0F172A] hover:bg-slate-800" onClick={() => { setUploadForm({ file: null, document_type: '', title: '', notes: '' }); setUploadErrors({}); setShowUploadModal(true); }}>
                  <Upload className="w-4 h-4 mr-2" /> Upload Document
                </Button>
              </CardContent></Card>
            );
            const DOC_TYPE_LABELS = {
              national_id: 'National ID', referee_id: 'Referee ID', next_of_kin_id: 'Next of Kin ID',
              contract: 'Contract', certificate: 'Certificate', disciplinary_letter: 'Disciplinary Letter', other: 'Other',
            };
            const DOC_TYPE_COLORS = {
              national_id: 'bg-blue-100 text-blue-700', referee_id: 'bg-purple-100 text-purple-700',
              next_of_kin_id: 'bg-teal-100 text-teal-700', contract: 'bg-emerald-100 text-emerald-700',
              certificate: 'bg-amber-100 text-amber-700', disciplinary_letter: 'bg-red-100 text-red-700',
              other: 'bg-slate-100 text-slate-600',
            };
            return (
              <div className="space-y-3">
                {docs.map(doc => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* File icon */}
                        <div className="p-2 bg-slate-50 rounded-lg shrink-0 self-start">
                          {doc.mime_type === 'application/pdf'
                            ? <FileText className="w-6 h-6 text-red-500" />
                            : <File className="w-6 h-6 text-blue-500" />}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900">{doc.title || doc.original_filename || '—'}</span>
                            <Badge className={`text-xs ${DOC_TYPE_COLORS[doc.document_type] || 'bg-slate-100 text-slate-600'}`}>
                              {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{doc.original_filename}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatFileSize(doc.file_size_bytes)}
                            {doc.uploaded_by_name && ` · Uploaded by ${doc.uploaded_by_name}`}
                            {doc.uploaded_at && ` · ${new Date(doc.uploaded_at).toLocaleDateString()}`}
                          </p>
                          {doc.notes && <p className="text-xs text-slate-500 italic mt-1">{doc.notes}</p>}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          {doc.view_url && (
                            <>
                              <Button size="sm" variant="outline" title="View" onClick={() => window.open(doc.view_url, '_blank')}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" title="Download" onClick={() => window.open(doc.download_url, '_blank')}>
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" title="Print" onClick={() => { const w = window.open(doc.view_url, '_blank'); w?.addEventListener('load', () => w.print()); }}>
                                <Printer className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete"
                            onClick={async () => {
                              if (!window.confirm(`Delete "${doc.title || doc.original_filename}"?`)) return;
                              try {
                                await storageService.deleteDocument(id, doc.id);
                                refresh('documents');
                                toast.success('Document deleted');
                              } catch (err) {
                                toast.error(formatApiError(err, 'Failed to delete document'));
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="allocation" className="mt-6 space-y-6">
          {/* Current allocation card */}
          {employee.availability_status === 'allocated' && employee.current_site_id ? (
            (() => {
              const activeAlloc = allocationHistoryQuery.data?.find(a => a.status === 'active');
              return (
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" />Current Site Allocation</CardTitle>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Allocated</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {allocationHistoryQuery.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : activeAlloc ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-slate-500 text-xs">Site</p><Link to={`/sites/${activeAlloc.site_id}`} className="font-medium text-slate-900 hover:underline">{activeAlloc.site_name || '-'}</Link></div>
                        <div><p className="text-slate-500 text-xs">Zone</p><p className="font-medium text-slate-900">{activeAlloc.zone_name || '-'}</p></div>
                        <div><p className="text-slate-500 text-xs">Allocated Since</p><p className="font-medium text-slate-900">{formatDate(activeAlloc.start_date)}</p></div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })()
          ) : (
            <Card>
              <CardContent className="py-8 flex items-center gap-3">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-sm px-3 py-1">Available</Badge>
                <span className="text-slate-500 text-sm">Not currently allocated to any site</span>
              </CardContent>
            </Card>
          )}

          {/* Allocation History */}
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Allocation History</h3>
            {allocationHistoryQuery.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : !allocationHistoryQuery.data?.length ? (
              <Card><CardContent className="py-6 text-center text-slate-500 text-sm">No allocation history</CardContent></Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Site</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Zone</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">From</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">To</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocationHistoryQuery.data.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5"><Link to={`/sites/${a.site_id}`} className="text-slate-900 hover:underline font-medium">{a.site_name || '-'}</Link></td>
                        <td className="px-4 py-2.5 text-slate-600">{a.zone_name || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDate(a.start_date)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{a.end_date ? formatDate(a.end_date) : <span className="text-emerald-600">Present</span>}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className={a.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>{a.status === 'active' ? 'Active' : 'Ended'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transfer History */}
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-3">Transfer History</h3>
            {transferHistoryQuery.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : !transferHistoryQuery.data?.length ? (
              <Card><CardContent className="py-6 text-center text-slate-500 text-sm">No transfer history</CardContent></Card>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">From Site</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">To Site</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium text-slate-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferHistoryQuery.data.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-900">{t.from_site_name || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-900">{t.to_site_name || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{formatDate(t.transfer_date)}</td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{t.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Offboard Modal */}
      {showOffboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-red-600">Offboard Employee</CardTitle>
                <button onClick={() => { setShowOffboardModal(false); setOffboardForm({ departure_reason: '', last_working_date: '', departure_notes: '', end_active_contract: true }); }}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Departure Reason *</Label>
                <select
                  value={offboardForm.departure_reason}
                  onChange={e => setOffboardForm(f => ({ ...f, departure_reason: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 border-slate-200"
                >
                  <option value="">Select reason...</option>
                  {DEPARTURE_REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Last Working Date *</Label>
                <Input type="date" value={offboardForm.last_working_date} onChange={e => setOffboardForm(f => ({ ...f, last_working_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={offboardForm.departure_notes} onChange={e => setOffboardForm(f => ({ ...f, departure_notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={offboardForm.end_active_contract}
                  onChange={e => setOffboardForm(f => ({ ...f, end_active_contract: e.target.checked }))}
                  className="w-4 h-4 accent-slate-900"
                />
                Terminate active contract
              </label>
              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={offboardMutation.isPending}
                  onClick={() => {
                    if (!offboardForm.departure_reason) { toast.error('Departure reason is required'); return; }
                    if (!offboardForm.last_working_date) { toast.error('Last working date is required'); return; }
                    offboardMutation.mutate(offboardForm);
                  }}
                >
                  {offboardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Offboard
                </Button>
                <Button variant="outline" onClick={() => { setShowOffboardModal(false); setOffboardForm({ departure_reason: '', last_working_date: '', departure_notes: '', end_active_contract: true }); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rehire Modal */}
      {showRehireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-emerald-600">Rehire Employee</CardTitle>
                <button onClick={() => { setShowRehireModal(false); setRehireForm({ rehire_date: '', notes: '' }); }}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {employee.total_employment_periods > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
                  This employee has had <strong>{employee.total_employment_periods}</strong> previous employment period{employee.total_employment_periods !== 1 ? 's' : ''}.
                </div>
              )}
              <div className="space-y-1">
                <Label>Rehire Date *</Label>
                <Input type="date" value={rehireForm.rehire_date} onChange={e => setRehireForm(f => ({ ...f, rehire_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={rehireForm.notes} onChange={e => setRehireForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={rehireMutation.isPending}
                  onClick={() => {
                    if (!rehireForm.rehire_date) { toast.error('Rehire date is required'); return; }
                    rehireMutation.mutate(rehireForm);
                  }}
                >
                  {rehireMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Rehire
                </Button>
                <Button variant="outline" onClick={() => { setShowRehireModal(false); setRehireForm({ rehire_date: '', notes: '' }); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6" onClick={() => setShowPhotoModal(false)}>
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold text-slate-900">Profile Photo</h3>
              <button type="button" onClick={() => setShowPhotoModal(false)} className="rounded-md p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {avatarSrc ? (
                <div className="mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-lg bg-slate-100">
                  <img src={avatarSrc} alt={employee.full_name} className="h-full w-full object-contain" onError={handleRefreshPhoto} />
                </div>
              ) : (
                <div
                  className="mx-auto flex aspect-square w-full max-w-xl items-center justify-center rounded-lg text-6xl font-semibold text-white"
                  style={{ backgroundColor: `hsl(${[...employee.full_name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 55%, 42%)` }}
                >
                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadPhoto.isPending || deletePhoto.isPending}>
                {uploadPhoto.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {avatarSrc ? 'Upload Another' : 'Upload Photo'}
              </Button>
              {avatarSrc && (
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deletePhoto.mutate()} disabled={uploadPhoto.isPending || deletePhoto.isPending}>
                  {deletePhoto.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-slate-900">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* File picker */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">File *</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${uploadForm.file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-400'} ${uploadErrors.file ? 'border-red-400' : ''}`}
                  onClick={() => document.getElementById('doc-file-input').click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadForm(u => ({ ...u, file: f })); }}
                >
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700">
                      <File className="w-4 h-4" />
                      <span className="text-sm font-medium truncate max-w-xs">{uploadForm.file.name}</span>
                      <span className="text-xs text-slate-500">({formatFileSize(uploadForm.file.size)})</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Drag & drop or click to browse</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, WEBP — max 20 MB</p>
                    </>
                  )}
                </div>
                <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setUploadForm(u => ({ ...u, file: f })); }} />
                {uploadErrors.file && <p className="text-xs text-red-600 mt-1">{uploadErrors.file}</p>}
              </div>

              {/* Document type */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Document Type *</label>
                <select
                  value={uploadForm.document_type}
                  onChange={e => setUploadForm(u => ({ ...u, document_type: e.target.value }))}
                  className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 ${uploadErrors.document_type ? 'border-red-500' : 'border-slate-200'}`}
                >
                  <option value="">Select type...</option>
                  <option value="national_id">National ID</option>
                  <option value="referee_id">Referee ID Copy</option>
                  <option value="next_of_kin_id">Next of Kin ID</option>
                  <option value="contract">Contract Document</option>
                  <option value="certificate">Certificate / Qualification</option>
                  <option value="disciplinary_letter">Disciplinary Letter</option>
                  <option value="other">Other</option>
                </select>
                {uploadErrors.document_type && <p className="text-xs text-red-600 mt-1">{uploadErrors.document_type}</p>}
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Title *</label>
                <Input
                  value={uploadForm.title}
                  onChange={e => setUploadForm(u => ({ ...u, title: e.target.value }))}
                  placeholder='e.g. "NIDA Card"'
                  className={uploadErrors.title ? 'border-red-500' : ''}
                />
                {uploadErrors.title && <p className="text-xs text-red-600 mt-1">{uploadErrors.title}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                <Input value={uploadForm.notes} onChange={e => setUploadForm(u => ({ ...u, notes: e.target.value }))} placeholder="Optional" />
              </div>

              {/* Progress bar */}
              {uploadProgress && (
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-slate-900 h-2 rounded-full animate-pulse w-3/4" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-[#0F172A] hover:bg-slate-800"
                  disabled={uploadProgress}
                  onClick={async () => {
                    const e = {};
                    if (!uploadForm.file) e.file = 'Select a file';
                    if (!uploadForm.document_type) e.document_type = 'Select a document type';
                    if (!uploadForm.title.trim()) e.title = 'Title is required';
                    if (Object.keys(e).length) { setUploadErrors(e); return; }
                    setUploadProgress(true);
                    try {
                      await storageService.uploadDocument(id, uploadForm.file, uploadForm.document_type, uploadForm.title, uploadForm.notes || null);
                      refresh('documents');
                      toast.success('Document uploaded');
                      setShowUploadModal(false);
                    } catch (err) {
                      toast.error(formatApiError(err, 'Upload failed'));
                    } finally {
                      setUploadProgress(false);
                    }
                  }}
                >
                  {uploadProgress ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload
                </Button>
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetail;

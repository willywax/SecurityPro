import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  User,
  CreditCard,
  Users,
  Heart,
  FileText,
  Package,
  File,
  Camera,
  X,
  Edit,
  Clock,
  Plus,
  Upload,
  Download,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  terminated: 'bg-red-100 text-red-700 border-red-200',
  on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
};

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
  on_leave: 'On Leave',
};

const genderLabels = { male: 'Male', female: 'Female', other: 'Other' };
const maritalLabels = { single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed' };

const idTypeOptions = [
  { value: 'national_id', label: 'National ID' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
];

const idTypeLabels = {
  national_id: 'National ID',
  voter_id: 'Voter ID',
  driving_license: 'Driving License',
  passport: 'Passport',
  other: 'Other',
};

const ComingSoonTab = ({ title, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm max-w-md">
      This section is coming soon. You'll be able to manage {title.toLowerCase()} here.
    </p>
  </div>
);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// ============ BANK DETAILS TAB COMPONENT ============
const BankDetailsTab = ({ employeeId, api }) => {
  const [bankAccount, setBankAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: '', bank_branch: '', account_name: '', account_number: ''
  });

  const fetchBankAccount = useCallback(async () => {
    try {
      const response = await api.get(`/employees/${employeeId}/bank-account`);
      setBankAccount(response.data);
      if (response.data) {
        setFormData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch bank account:', error);
    } finally {
      setLoading(false);
    }
  }, [api, employeeId]);

  useEffect(() => { fetchBankAccount(); }, [fetchBankAccount]);

  const handleSave = async () => {
    if (!formData.bank_name || !formData.account_name || !formData.account_number) {
      toast.error('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post(`/employees/${employeeId}/bank-account`, formData);
      setBankAccount(response.data);
      setIsEditing(false);
      toast.success('Bank details saved');
    } catch (error) {
      toast.error('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${employeeId}/bank-account`);
      setBankAccount(null);
      setFormData({ bank_name: '', bank_branch: '', account_name: '', account_number: '' });
      toast.success('Bank details deleted');
    } catch (error) {
      toast.error('Failed to delete bank details');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!bankAccount && !isEditing) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No bank details added</h3>
          <p className="text-slate-500 text-sm mb-4">Add bank account information for this employee</p>
          <Button onClick={() => setIsEditing(true)} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-bank">
            <Plus className="w-4 h-4 mr-2" />Add Bank Details
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Bank Account Details</CardTitle>
        {!isEditing && bankAccount && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="btn-edit-bank">
              <Edit className="w-4 h-4 mr-1" />Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600" data-testid="btn-delete-bank">
                  <Trash2 className="w-4 h-4 mr-1" />Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bank Details</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input value={formData.bank_name} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} placeholder="e.g., Stanbic Bank" data-testid="input-bank-name" />
              </div>
              <div className="space-y-2">
                <Label>Bank Branch</Label>
                <Input value={formData.bank_branch || ''} onChange={(e) => setFormData({...formData, bank_branch: e.target.value})} placeholder="e.g., Kampala Main" data-testid="input-bank-branch" />
              </div>
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input value={formData.account_name} onChange={(e) => setFormData({...formData, account_name: e.target.value})} placeholder="Account holder name" data-testid="input-account-name" />
              </div>
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input value={formData.account_number} onChange={(e) => setFormData({...formData, account_number: e.target.value})} placeholder="Account number" data-testid="input-account-number" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setIsEditing(false); if (bankAccount) setFormData(bankAccount); }} data-testid="btn-cancel-bank">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save-bank">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div><dt className="text-sm font-medium text-slate-500">Bank Name</dt><dd className="mt-1 text-sm text-slate-900">{bankAccount.bank_name}</dd></div>
            <div><dt className="text-sm font-medium text-slate-500">Bank Branch</dt><dd className="mt-1 text-sm text-slate-900">{bankAccount.bank_branch || '-'}</dd></div>
            <div><dt className="text-sm font-medium text-slate-500">Account Name</dt><dd className="mt-1 text-sm text-slate-900">{bankAccount.account_name}</dd></div>
            <div><dt className="text-sm font-medium text-slate-500">Account Number</dt><dd className="mt-1 text-sm text-slate-900 font-mono">{bankAccount.account_number}</dd></div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
};

// ============ REFEREES TAB COMPONENT ============
const RefereesTab = ({ employeeId, api }) => {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReferee, setEditingReferee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const fileInputRefs = useRef({});

  const emptyForm = {
    full_name: '', relationship: '', phone_number: '', alternate_phone: '',
    id_type: '', id_number: '', address: '', occupation: '', notes: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchReferees = useCallback(async () => {
    try {
      const response = await api.get(`/employees/${employeeId}/referees`);
      setReferees(response.data);
    } catch (error) {
      console.error('Failed to fetch referees:', error);
    } finally {
      setLoading(false);
    }
  }, [api, employeeId]);

  useEffect(() => { fetchReferees(); }, [fetchReferees]);

  const openAddDialog = () => {
    setEditingReferee(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (referee) => {
    setEditingReferee(referee);
    setFormData({
      full_name: referee.full_name || '',
      relationship: referee.relationship || '',
      phone_number: referee.phone_number || '',
      alternate_phone: referee.alternate_phone || '',
      id_type: referee.id_type || '',
      id_number: referee.id_number || '',
      address: referee.address || '',
      occupation: referee.occupation || '',
      notes: referee.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.relationship || !formData.phone_number) {
      toast.error('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.id_type) delete payload.id_type;
      
      if (editingReferee) {
        await api.put(`/employees/${employeeId}/referees/${editingReferee.id}`, payload);
        toast.success('Referee updated');
      } else {
        await api.post(`/employees/${employeeId}/referees`, payload);
        toast.success('Referee added');
      }
      fetchReferees();
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save referee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (refereeId) => {
    try {
      await api.delete(`/employees/${employeeId}/referees/${refereeId}`);
      setReferees(referees.filter(r => r.id !== refereeId));
      toast.success('Referee deleted');
    } catch (error) {
      toast.error('Failed to delete referee');
    }
  };

  const handleFileUpload = async (refereeId, file) => {
    if (!file) return;
    setUploading({ ...uploading, [refereeId]: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/employees/${employeeId}/referees/${refereeId}/id-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchReferees();
      toast.success('ID document uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload');
    } finally {
      setUploading({ ...uploading, [refereeId]: false });
    }
  };

  const handleFileDelete = async (refereeId) => {
    try {
      await api.delete(`/employees/${employeeId}/referees/${refereeId}/id-document`);
      fetchReferees();
      toast.success('ID document removed');
    } catch (error) {
      toast.error('Failed to remove document');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Referees ({referees.length})</h3>
        <Button onClick={openAddDialog} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-referee">
          <Plus className="w-4 h-4 mr-2" />Add Referee
        </Button>
      </div>

      {referees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No referees added</h3>
            <p className="text-slate-500 text-sm">Add referee information for this employee</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {referees.map((referee) => (
            <Card key={referee.id} data-testid={`referee-card-${referee.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-900">{referee.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Relationship</p>
                      <p className="text-slate-900">{referee.relationship}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="text-slate-900">{referee.phone_number}</p>
                      {referee.alternate_phone && <p className="text-slate-500 text-sm">{referee.alternate_phone}</p>}
                    </div>
                    {referee.occupation && (
                      <div>
                        <p className="text-sm text-slate-500">Occupation</p>
                        <p className="text-slate-900">{referee.occupation}</p>
                      </div>
                    )}
                    {referee.id_type && (
                      <div>
                        <p className="text-sm text-slate-500">ID Type / Number</p>
                        <p className="text-slate-900">{idTypeLabels[referee.id_type]} - {referee.id_number || '-'}</p>
                      </div>
                    )}
                    {referee.address && (
                      <div className="sm:col-span-2">
                        <p className="text-sm text-slate-500">Address</p>
                        <p className="text-slate-900">{referee.address}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {referee.id_softcopy_file ? (
                      <div className="flex items-center gap-1">
                        <a href={`${BACKEND_URL}${referee.id_softcopy_file}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />View ID
                        </a>
                        <Button variant="ghost" size="sm" onClick={() => handleFileDelete(referee.id)} className="text-red-600 h-7 px-2">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input type="file" ref={el => fileInputRefs.current[referee.id] = el} onChange={(e) => handleFileUpload(referee.id, e.target.files[0])} accept="image/*,application/pdf" className="hidden" />
                        <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[referee.id]?.click()} disabled={uploading[referee.id]} className="text-xs">
                          {uploading[referee.id] ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}Upload ID
                        </Button>
                      </>
                    )}
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(referee)} className="flex-1" data-testid={`btn-edit-referee-${referee.id}`}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 flex-1" data-testid={`btn-delete-referee-${referee.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Referee</AlertDialogTitle>
                            <AlertDialogDescription>Delete {referee.full_name}? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(referee.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReferee ? 'Edit Referee' : 'Add Referee'}</DialogTitle>
            <DialogDescription>Enter the referee's information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} placeholder="Full name" data-testid="input-referee-name" />
            </div>
            <div className="space-y-2">
              <Label>Relationship *</Label>
              <Input value={formData.relationship} onChange={(e) => setFormData({...formData, relationship: e.target.value})} placeholder="e.g., Former Employer" data-testid="input-referee-relationship" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} placeholder="+256 700 123456" data-testid="input-referee-phone" />
            </div>
            <div className="space-y-2">
              <Label>Alternate Phone</Label>
              <Input value={formData.alternate_phone} onChange={(e) => setFormData({...formData, alternate_phone: e.target.value})} placeholder="+256 700 654321" />
            </div>
            <div className="space-y-2">
              <Label>ID Type</Label>
              <Select value={formData.id_type} onValueChange={(value) => setFormData({...formData, id_type: value})}>
                <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                <SelectContent>
                  {idTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input value={formData.id_number} onChange={(e) => setFormData({...formData, id_number: e.target.value})} placeholder="ID number" />
            </div>
            <div className="space-y-2">
              <Label>Occupation</Label>
              <Input value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} placeholder="e.g., Business Owner" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address" rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save-referee">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ NEXT OF KIN TAB COMPONENT ============
const NextOfKinTab = ({ employeeId, api }) => {
  const [nextOfKin, setNextOfKin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const emptyForm = {
    full_name: '', relationship: '', phone_1: '', phone_2: '',
    address: '', id_type: '', id_number: '', notes: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchNextOfKin = useCallback(async () => {
    try {
      const response = await api.get(`/employees/${employeeId}/next-of-kin`);
      setNextOfKin(response.data);
      if (response.data) setFormData(response.data);
    } catch (error) {
      console.error('Failed to fetch next of kin:', error);
    } finally {
      setLoading(false);
    }
  }, [api, employeeId]);

  useEffect(() => { fetchNextOfKin(); }, [fetchNextOfKin]);

  const handleSave = async () => {
    if (!formData.full_name || !formData.relationship || !formData.phone_1) {
      toast.error('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.id_type) delete payload.id_type;
      
      const response = await api.post(`/employees/${employeeId}/next-of-kin`, payload);
      setNextOfKin(response.data);
      setIsEditing(false);
      toast.success('Next of kin saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/employees/${employeeId}/next-of-kin`);
      setNextOfKin(null);
      setFormData(emptyForm);
      toast.success('Next of kin deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/employees/${employeeId}/next-of-kin/id-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNextOfKin(response.data);
      toast.success('ID document uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async () => {
    try {
      const response = await api.delete(`/employees/${employeeId}/next-of-kin/id-document`);
      setNextOfKin(response.data);
      toast.success('ID document removed');
    } catch (error) {
      toast.error('Failed to remove document');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!nextOfKin && !isEditing) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No next of kin added</h3>
          <p className="text-slate-500 text-sm mb-4">Add emergency contact information</p>
          <Button onClick={() => setIsEditing(true)} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-nok">
            <Plus className="w-4 h-4 mr-2" />Add Next of Kin
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Next of Kin</CardTitle>
        {!isEditing && nextOfKin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} data-testid="btn-edit-nok">
              <Edit className="w-4 h-4 mr-1" />Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600" data-testid="btn-delete-nok">
                  <Trash2 className="w-4 h-4 mr-1" />Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Next of Kin</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} placeholder="Full name" data-testid="input-nok-name" />
              </div>
              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Input value={formData.relationship} onChange={(e) => setFormData({...formData, relationship: e.target.value})} placeholder="e.g., Spouse, Parent" data-testid="input-nok-relationship" />
              </div>
              <div className="space-y-2">
                <Label>Primary Phone *</Label>
                <Input value={formData.phone_1} onChange={(e) => setFormData({...formData, phone_1: e.target.value})} placeholder="+256 700 123456" data-testid="input-nok-phone1" />
              </div>
              <div className="space-y-2">
                <Label>Secondary Phone</Label>
                <Input value={formData.phone_2 || ''} onChange={(e) => setFormData({...formData, phone_2: e.target.value})} placeholder="+256 700 654321" />
              </div>
              <div className="space-y-2">
                <Label>ID Type</Label>
                <Select value={formData.id_type || ''} onValueChange={(value) => setFormData({...formData, id_type: value})}>
                  <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                  <SelectContent>
                    {idTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input value={formData.id_number || ''} onChange={(e) => setFormData({...formData, id_number: e.target.value})} placeholder="ID number" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address" rows={2} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional notes" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setIsEditing(false); if (nextOfKin) setFormData(nextOfKin); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save-nok">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div><dt className="text-sm font-medium text-slate-500">Full Name</dt><dd className="mt-1 text-sm text-slate-900">{nextOfKin.full_name}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Relationship</dt><dd className="mt-1 text-sm text-slate-900">{nextOfKin.relationship}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Primary Phone</dt><dd className="mt-1 text-sm text-slate-900">{nextOfKin.phone_1}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Secondary Phone</dt><dd className="mt-1 text-sm text-slate-900">{nextOfKin.phone_2 || '-'}</dd></div>
              {nextOfKin.id_type && <div><dt className="text-sm font-medium text-slate-500">ID Type</dt><dd className="mt-1 text-sm text-slate-900">{idTypeLabels[nextOfKin.id_type]}</dd></div>}
              {nextOfKin.id_number && <div><dt className="text-sm font-medium text-slate-500">ID Number</dt><dd className="mt-1 text-sm text-slate-900 font-mono">{nextOfKin.id_number}</dd></div>}
              {nextOfKin.address && <div className="sm:col-span-2"><dt className="text-sm font-medium text-slate-500">Address</dt><dd className="mt-1 text-sm text-slate-900">{nextOfKin.address}</dd></div>}
              {nextOfKin.notes && <div className="sm:col-span-2"><dt className="text-sm font-medium text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900">{nextOfKin.notes}</dd></div>}
            </dl>
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-slate-500">ID Document</Label>
              <div className="mt-2">
                {nextOfKin.id_softcopy_file ? (
                  <div className="flex items-center gap-3">
                    <a href={`${BACKEND_URL}${nextOfKin.id_softcopy_file}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Eye className="w-4 h-4" />View Document
                    </a>
                    <Button variant="outline" size="sm" onClick={handleFileDelete} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-1" />Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <input ref={fileInputRef} type="file" onChange={(e) => handleFileUpload(e.target.files[0])} accept="image/*,application/pdf" className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Upload ID Document
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============ MAIN EMPLOYEE DETAIL COMPONENT ============
const EmployeeDetail = () => {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await api.get(`/employees/${id}`);
        setEmployee(response.data);
        setFormData(response.data);
      } catch (error) {
        if (error.response?.status === 404) {
          toast.error('Employee not found');
          navigate('/employees');
        } else {
          toast.error('Failed to load employee');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id, api, navigate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {};
      const editableFields = [
        'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'marital_status',
        'nationality', 'nin', 'phone_1', 'phone_2', 'email', 'physical_address', 'postal_address',
        'education_background', 'job_title', 'employment_status', 'hire_date', 'termination_date', 'notes'
      ];
      for (const field of editableFields) {
        if (formData[field] !== employee[field]) payload[field] = formData[field] || null;
      }
      if (Object.keys(payload).length > 0) {
        const response = await api.put(`/employees/${id}`, payload);
        setEmployee(response.data);
        setFormData(response.data);
        toast.success('Employee updated successfully');
      }
      setIsEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setFormData(employee); setErrors({}); setIsEditing(false); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      navigate('/employees');
    } catch (error) {
      toast.error('Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/employees/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEmployee(response.data);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setUploadingPhoto(true);
    try {
      const response = await api.delete(`/employees/${id}/photo`);
      setEmployee(response.data);
      toast.success('Photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }
  if (!employee) return null;

  return (
    <div className="space-y-6" data-testid="employee-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/employees"><Button variant="ghost" size="icon" data-testid="btn-back"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {employee.profile_photo ? (
                <img src={`${BACKEND_URL}${employee.profile_photo}`} alt={employee.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200"><User className="w-8 h-8 text-slate-400" /></div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="p-1.5 bg-white rounded-full text-slate-700 hover:bg-slate-100" data-testid="btn-upload-photo"><Camera className="w-3.5 h-3.5" /></button>
                {employee.profile_photo && <button onClick={handlePhotoDelete} disabled={uploadingPhoto} className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50" data-testid="btn-delete-photo"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{employee.full_name}</h1>
                <Badge variant="outline" className={statusColors[employee.employment_status]}>{statusLabels[employee.employment_status]}</Badge>
              </div>
              <p className="text-slate-500 text-sm">{employee.employee_id} {employee.guard_no && `· Guard #${employee.guard_no}`}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} data-testid="btn-cancel-edit">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} data-testid="btn-edit"><Edit className="w-4 h-4 mr-2" />Edit</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="btn-delete"><Trash2 className="w-4 h-4 mr-2" />Delete</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete Employee</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {employee.full_name}? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" data-testid="btn-confirm-delete">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent p-0 h-auto flex-wrap">
          <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-bank"><CreditCard className="w-4 h-4 mr-2" />Bank Details</TabsTrigger>
          <TabsTrigger value="referees" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-referees"><Users className="w-4 h-4 mr-2" />Referees</TabsTrigger>
          <TabsTrigger value="nextofkin" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-nextofkin"><Heart className="w-4 h-4 mr-2" />Next of Kin</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-contracts"><FileText className="w-4 h-4 mr-2" />Contracts</TabsTrigger>
          <TabsTrigger value="assets" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-assets"><Package className="w-4 h-4 mr-2" />Assets Issued</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3" data-testid="tab-documents"><File className="w-4 h-4 mr-2" />Documents</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          {isEditing ? (
            <div className="space-y-6">
              <Card><CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>First Name *</Label><Input value={formData.first_name || ''} onChange={(e) => handleChange('first_name', e.target.value)} className={errors.first_name ? 'border-red-500' : ''} data-testid="input-first-name" />{errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}</div>
                  <div className="space-y-2"><Label>Middle Name</Label><Input value={formData.middle_name || ''} onChange={(e) => handleChange('middle_name', e.target.value)} data-testid="input-middle-name" /></div>
                  <div className="space-y-2"><Label>Last Name *</Label><Input value={formData.last_name || ''} onChange={(e) => handleChange('last_name', e.target.value)} className={errors.last_name ? 'border-red-500' : ''} data-testid="input-last-name" />{errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}</div>
                  <div className="space-y-2"><Label>Gender</Label><Select value={formData.gender || ''} onValueChange={(v) => handleChange('gender', v)}><SelectTrigger data-testid="select-gender"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.date_of_birth || ''} onChange={(e) => handleChange('date_of_birth', e.target.value)} data-testid="input-dob" /></div>
                  <div className="space-y-2"><Label>Marital Status</Label><Select value={formData.marital_status || ''} onValueChange={(v) => handleChange('marital_status', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Nationality</Label><Input value={formData.nationality || ''} onChange={(e) => handleChange('nationality', e.target.value)} data-testid="input-nationality" /></div>
                  <div className="space-y-2"><Label>NIN</Label><Input value={formData.nin || ''} onChange={(e) => handleChange('nin', e.target.value)} data-testid="input-nin" /></div>
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Primary Phone</Label><Input value={formData.phone_1 || ''} onChange={(e) => handleChange('phone_1', e.target.value)} data-testid="input-phone-1" /></div>
                  <div className="space-y-2"><Label>Secondary Phone</Label><Input value={formData.phone_2 || ''} onChange={(e) => handleChange('phone_2', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} className={errors.email ? 'border-red-500' : ''} data-testid="input-email" />{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}</div>
                  <div className="space-y-2 md:col-span-2"><Label>Physical Address</Label><Textarea value={formData.physical_address || ''} onChange={(e) => handleChange('physical_address', e.target.value)} rows={2} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Postal Address</Label><Input value={formData.postal_address || ''} onChange={(e) => handleChange('postal_address', e.target.value)} /></div>
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-lg">Employment Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Job Title</Label><Input value={formData.job_title || ''} onChange={(e) => handleChange('job_title', e.target.value)} data-testid="input-job-title" /></div>
                  <div className="space-y-2"><Label>Status</Label><Select value={formData.employment_status || 'active'} onValueChange={(v) => handleChange('employment_status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="on_leave">On Leave</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={formData.hire_date || ''} onChange={(e) => handleChange('hire_date', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Termination Date</Label><Input type="date" value={formData.termination_date || ''} onChange={(e) => handleChange('termination_date', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Education</Label><Input value={formData.education_background || ''} onChange={(e) => handleChange('education_background', e.target.value)} /></div>
                  <div className="space-y-2 md:col-span-2 lg:col-span-3"><Label>Notes</Label><Textarea value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={3} /></div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <Card><CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
                <CardContent><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  <div><dt className="text-sm font-medium text-slate-500">Employee ID</dt><dd className="mt-1 text-sm text-slate-900">{employee.employee_id}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Guard Number</dt><dd className="mt-1 text-sm text-slate-900">{employee.guard_no || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Full Name</dt><dd className="mt-1 text-sm text-slate-900">{employee.full_name}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Gender</dt><dd className="mt-1 text-sm text-slate-900">{genderLabels[employee.gender] || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Date of Birth</dt><dd className="mt-1 text-sm text-slate-900">{formatDate(employee.date_of_birth)}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Marital Status</dt><dd className="mt-1 text-sm text-slate-900">{maritalLabels[employee.marital_status] || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Nationality</dt><dd className="mt-1 text-sm text-slate-900">{employee.nationality || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">NIN</dt><dd className="mt-1 text-sm text-slate-900 font-mono">{employee.nin || '-'}</dd></div>
                </dl></CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
                <CardContent><dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div><dt className="text-sm font-medium text-slate-500">Primary Phone</dt><dd className="mt-1 text-sm text-slate-900">{employee.phone_1 || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Secondary Phone</dt><dd className="mt-1 text-sm text-slate-900">{employee.phone_2 || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Email</dt><dd className="mt-1 text-sm text-slate-900">{employee.email || '-'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-sm font-medium text-slate-500">Physical Address</dt><dd className="mt-1 text-sm text-slate-900">{employee.physical_address || '-'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-sm font-medium text-slate-500">Postal Address</dt><dd className="mt-1 text-sm text-slate-900">{employee.postal_address || '-'}</dd></div>
                </dl></CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-lg">Employment Details</CardTitle></CardHeader>
                <CardContent><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  <div><dt className="text-sm font-medium text-slate-500">Job Title</dt><dd className="mt-1 text-sm text-slate-900">{employee.job_title || '-'}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd className="mt-1"><Badge variant="outline" className={statusColors[employee.employment_status]}>{statusLabels[employee.employment_status]}</Badge></dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Hire Date</dt><dd className="mt-1 text-sm text-slate-900">{formatDate(employee.hire_date)}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Termination Date</dt><dd className="mt-1 text-sm text-slate-900">{formatDate(employee.termination_date)}</dd></div>
                  <div><dt className="text-sm font-medium text-slate-500">Education</dt><dd className="mt-1 text-sm text-slate-900">{employee.education_background || '-'}</dd></div>
                  <div className="sm:col-span-2 lg:col-span-3"><dt className="text-sm font-medium text-slate-500">Notes</dt><dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{employee.notes || '-'}</dd></div>
                </dl></CardContent>
              </Card>
              <Card><CardContent className="py-4"><div className="flex items-center gap-2 text-sm text-slate-500"><Clock className="w-4 h-4" /><span>Created {formatDate(employee.created_at)} · Last updated {formatDate(employee.updated_at)}</span></div></CardContent></Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bank" className="mt-6"><BankDetailsTab employeeId={id} api={api} /></TabsContent>
        <TabsContent value="referees" className="mt-6"><RefereesTab employeeId={id} api={api} /></TabsContent>
        <TabsContent value="nextofkin" className="mt-6"><NextOfKinTab employeeId={id} api={api} /></TabsContent>
        <TabsContent value="contracts" className="mt-6"><Card><CardContent><ComingSoonTab title="Contracts" icon={FileText} /></CardContent></Card></TabsContent>
        <TabsContent value="assets" className="mt-6"><Card><CardContent><ComingSoonTab title="Assets Issued" icon={Package} /></CardContent></Card></TabsContent>
        <TabsContent value="documents" className="mt-6"><Card><CardContent><ComingSoonTab title="Documents" icon={File} /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;

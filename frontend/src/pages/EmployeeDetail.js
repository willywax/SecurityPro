import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

const genderLabels = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const maritalLabels = {
  single: 'Single',
  married: 'Married',
  divorced: 'Divorced',
  widowed: 'Widowed',
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

  // Fetch employee
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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.employee_id?.trim()) newErrors.employee_id = 'Employee ID is required';
    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {};
      const editableFields = [
        'employee_id', 'guard_no', 'first_name', 'middle_name', 'last_name',
        'gender', 'date_of_birth', 'marital_status', 'nationality', 'nin',
        'phone_1', 'phone_2', 'email', 'physical_address', 'postal_address',
        'education_background', 'job_title', 'employment_status', 'hire_date',
        'termination_date', 'notes'
      ];

      for (const field of editableFields) {
        if (formData[field] !== employee[field]) {
          payload[field] = formData[field] || null;
        }
      }

      if (Object.keys(payload).length > 0) {
        const response = await api.put(`/employees/${id}`, payload);
        setEmployee(response.data);
        setFormData(response.data);
        toast.success('Employee updated successfully');
      }
      setIsEditing(false);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update employee';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(employee);
    setErrors({});
    setIsEditing(false);
  };

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
      setFormData(prev => ({ ...prev, profile_photo: response.data.profile_photo }));
      toast.success('Photo uploaded successfully');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to upload photo';
      toast.error(message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setUploadingPhoto(true);
    try {
      const response = await api.delete(`/employees/${id}/photo`);
      setEmployee(response.data);
      setFormData(prev => ({ ...prev, profile_photo: null }));
      toast.success('Photo removed');
    } catch (error) {
      toast.error('Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="space-y-6" data-testid="employee-detail-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/employees">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            {/* Profile Photo */}
            <div className="relative group">
              {employee.profile_photo ? (
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}${employee.profile_photo}`}
                  alt={employee.full_name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="p-1.5 bg-white rounded-full text-slate-700 hover:bg-slate-100"
                  data-testid="btn-upload-photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                {employee.profile_photo && (
                  <button
                    onClick={handlePhotoDelete}
                    disabled={uploadingPhoto}
                    className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50"
                    data-testid="btn-delete-photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {employee.full_name}
                </h1>
                <Badge
                  variant="outline"
                  className={statusColors[employee.employment_status]}
                >
                  {statusLabels[employee.employment_status]}
                </Badge>
              </div>
              <p className="text-slate-500 text-sm">
                {employee.employee_id} {employee.guard_no && `· Guard #${employee.guard_no}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} data-testid="btn-cancel-edit">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0F172A] hover:bg-slate-800"
                data-testid="btn-save"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                data-testid="btn-edit"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid="btn-delete">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {employee.full_name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="btn-confirm-delete"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent p-0 h-auto flex-wrap">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-profile"
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="bank"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-bank"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Bank Details
          </TabsTrigger>
          <TabsTrigger
            value="referees"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-referees"
          >
            <Users className="w-4 h-4 mr-2" />
            Referees
          </TabsTrigger>
          <TabsTrigger
            value="nextofkin"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-nextofkin"
          >
            <Heart className="w-4 h-4 mr-2" />
            Next of Kin
          </TabsTrigger>
          <TabsTrigger
            value="contracts"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-contracts"
          >
            <FileText className="w-4 h-4 mr-2" />
            Contracts
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-assets"
          >
            <Package className="w-4 h-4 mr-2" />
            Assets Issued
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="data-[state=active]:border-b-2 data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent rounded-none px-4 py-3"
            data-testid="tab-documents"
          >
            <File className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
          {isEditing ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID *</Label>
                    <Input
                      id="employee_id"
                      value={formData.employee_id || ''}
                      onChange={(e) => handleChange('employee_id', e.target.value)}
                      className={errors.employee_id ? 'border-red-500' : ''}
                      data-testid="input-employee-id"
                    />
                    {errors.employee_id && (
                      <p className="text-sm text-red-500">{errors.employee_id}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guard_no">Guard Number</Label>
                    <Input
                      id="guard_no"
                      value={formData.guard_no || ''}
                      onChange={(e) => handleChange('guard_no', e.target.value)}
                      data-testid="input-guard-no"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name || ''}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      className={errors.first_name ? 'border-red-500' : ''}
                      data-testid="input-first-name"
                    />
                    {errors.first_name && (
                      <p className="text-sm text-red-500">{errors.first_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input
                      id="middle_name"
                      value={formData.middle_name || ''}
                      onChange={(e) => handleChange('middle_name', e.target.value)}
                      data-testid="input-middle-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name || ''}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      className={errors.last_name ? 'border-red-500' : ''}
                      data-testid="input-last-name"
                    />
                    {errors.last_name && (
                      <p className="text-sm text-red-500">{errors.last_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender || ''}
                      onValueChange={(value) => handleChange('gender', value)}
                    >
                      <SelectTrigger data-testid="select-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      data-testid="input-dob"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select
                      value={formData.marital_status || ''}
                      onValueChange={(value) => handleChange('marital_status', value)}
                    >
                      <SelectTrigger data-testid="select-marital-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality || ''}
                      onChange={(e) => handleChange('nationality', e.target.value)}
                      data-testid="input-nationality"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nin">NIN (National ID)</Label>
                    <Input
                      id="nin"
                      value={formData.nin || ''}
                      onChange={(e) => handleChange('nin', e.target.value)}
                      data-testid="input-nin"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_1">Primary Phone</Label>
                    <Input
                      id="phone_1"
                      type="tel"
                      value={formData.phone_1 || ''}
                      onChange={(e) => handleChange('phone_1', e.target.value)}
                      data-testid="input-phone-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_2">Secondary Phone</Label>
                    <Input
                      id="phone_2"
                      type="tel"
                      value={formData.phone_2 || ''}
                      onChange={(e) => handleChange('phone_2', e.target.value)}
                      data-testid="input-phone-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                      data-testid="input-email"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="physical_address">Physical Address</Label>
                    <Textarea
                      id="physical_address"
                      value={formData.physical_address || ''}
                      onChange={(e) => handleChange('physical_address', e.target.value)}
                      rows={2}
                      data-testid="input-physical-address"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="postal_address">Postal Address</Label>
                    <Input
                      id="postal_address"
                      value={formData.postal_address || ''}
                      onChange={(e) => handleChange('postal_address', e.target.value)}
                      data-testid="input-postal-address"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title || ''}
                      onChange={(e) => handleChange('job_title', e.target.value)}
                      data-testid="input-job-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employment_status">Employment Status</Label>
                    <Select
                      value={formData.employment_status || 'active'}
                      onValueChange={(value) => handleChange('employment_status', value)}
                    >
                      <SelectTrigger data-testid="select-employment-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date || ''}
                      onChange={(e) => handleChange('hire_date', e.target.value)}
                      data-testid="input-hire-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termination_date">Termination Date</Label>
                    <Input
                      id="termination_date"
                      type="date"
                      value={formData.termination_date || ''}
                      onChange={(e) => handleChange('termination_date', e.target.value)}
                      data-testid="input-termination-date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education_background">Education Background</Label>
                    <Input
                      id="education_background"
                      value={formData.education_background || ''}
                      onChange={(e) => handleChange('education_background', e.target.value)}
                      data-testid="input-education"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      rows={3}
                      data-testid="input-notes"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Employee ID</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.employee_id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Guard Number</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.guard_no || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Full Name</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.full_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Gender</dt>
                      <dd className="mt-1 text-sm text-slate-900">{genderLabels[employee.gender] || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Date of Birth</dt>
                      <dd className="mt-1 text-sm text-slate-900">{formatDate(employee.date_of_birth)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Marital Status</dt>
                      <dd className="mt-1 text-sm text-slate-900">{maritalLabels[employee.marital_status] || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Nationality</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.nationality || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">NIN (National ID)</dt>
                      <dd className="mt-1 text-sm text-slate-900 font-mono">{employee.nin || '-'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Primary Phone</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.phone_1 || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Secondary Phone</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.phone_2 || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Email</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.email || '-'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-slate-500">Physical Address</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.physical_address || '-'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-slate-500">Postal Address</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.postal_address || '-'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Employment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Job Title</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.job_title || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Employment Status</dt>
                      <dd className="mt-1">
                        <Badge variant="outline" className={statusColors[employee.employment_status]}>
                          {statusLabels[employee.employment_status]}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Hire Date</dt>
                      <dd className="mt-1 text-sm text-slate-900">{formatDate(employee.hire_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Termination Date</dt>
                      <dd className="mt-1 text-sm text-slate-900">{formatDate(employee.termination_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-slate-500">Education Background</dt>
                      <dd className="mt-1 text-sm text-slate-900">{employee.education_background || '-'}</dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-sm font-medium text-slate-500">Notes</dt>
                      <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{employee.notes || '-'}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Record Info */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>Created {formatDate(employee.created_at)} · Last updated {formatDate(employee.updated_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Other Tabs - Coming Soon */}
        <TabsContent value="bank" className="mt-6">
          <Card>
            <CardContent>
              <ComingSoonTab title="Bank Details" icon={CreditCard} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referees" className="mt-6">
          <Card>
            <CardContent>
              <ComingSoonTab title="Referees" icon={Users} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nextofkin" className="mt-6">
          <Card>
            <CardContent>
              <ComingSoonTab title="Next of Kin" icon={Heart} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <Card>
            <CardContent>
              <ComingSoonTab title="Contracts" icon={FileText} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <Card>
            <CardContent>
              <ComingSoonTab title="Assets Issued" icon={Package} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent>
              <ComingSoonTab title="Documents" icon={File} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;

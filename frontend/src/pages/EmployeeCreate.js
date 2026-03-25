import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatApiError } from '@/utils/errors';
import { ArrowLeft, Loader2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import employeeService from '@/services/employeeService';
import regionService from '@/services/regionService';

const EmployeeCreate = () => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    nationality: '',
    nin: '',
    phone_1: '',
    phone_2: '',
    email: '',
    physical_address: '',
    region_id: '',
    education_background: '',
    job_title: 'Security Guard',
    employment_status: 'active',
    date_joined: '',
    notes: '',
  });

  const regionsQuery = useQuery({
    queryKey: ['regions', 'employee-form'],
    queryFn: () => regionService.getAll({ status_filter: 'active' }),
  });
  const regions = Array.isArray(regionsQuery.data) ? regionsQuery.data : regionsQuery.data?.data || [];
  const regionPlaceholder = regionsQuery.isLoading
    ? 'Loading regions...'
    : regionsQuery.isError
      ? 'Failed to load regions'
      : regions.length === 0
        ? 'No active regions available'
        : 'Select region';

  const createEmployee = useMutation({
    mutationFn: employeeService.create,
    onSuccess: (employee) => {
      toast.success(`Employee created with ID: ${employee.employee_id}`);
      navigate(`/employees/${employee.id}`);
    },
    onError: (error) => {
      toast.error(formatApiError(error, 'Failed to create employee'));
    },
  });

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: null }));
    }
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.first_name.trim()) nextErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) nextErrors.last_name = 'Last name is required';
    if (!formData.nationality.trim()) nextErrors.nationality = 'Nationality is required';
    if (!formData.phone_1.trim()) nextErrors.phone_1 = 'Primary phone is required';
    else if (!/^(\+255|0)[67]\d{8}$/.test(formData.phone_1)) nextErrors.phone_1 = 'Phone number must be a valid Tanzanian number (+255XXXXXXXXX or 0XXXXXXXXX)';
    if (formData.phone_2 && !/^(\+255|0)[67]\d{8}$/.test(formData.phone_2)) nextErrors.phone_2 = 'Phone number must be a valid Tanzanian number (+255XXXXXXXXX or 0XXXXXXXXX)';
    if (!formData.physical_address.trim()) nextErrors.physical_address = 'Physical address is required';
    if (!formData.job_title.trim()) nextErrors.job_title = 'Job title is required';
    if (!formData.date_joined.trim()) nextErrors.date_joined = 'Date joined is required';
    if (formData.nin && (!/^\d{20}$/.test(formData.nin))) nextErrors.nin = 'NIN must be exactly 20 digits';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Invalid email format';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    createEmployee.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="employee-create-page">
      <div className="flex items-center gap-4">
        <Link to="/employees">
          <Button variant="ghost" size="icon" data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Employee</h1>
          <p className="text-slate-500 text-sm mt-1">Add a new employee to your organization</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">Employee ID and Guard Number will be auto-generated</p>
          <p className="text-blue-700">The system will assign unique IDs when the record is created.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" value={formData.first_name} onChange={(event) => handleChange('first_name', event.target.value)} className={errors.first_name ? 'border-red-500' : ''} data-testid="input-first-name" />
              {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input id="middle_name" value={formData.middle_name} onChange={(event) => handleChange('middle_name', event.target.value)} data-testid="input-middle-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={formData.last_name} onChange={(event) => handleChange('last_name', event.target.value)} className={errors.last_name ? 'border-red-500' : ''} data-testid="input-last-name" />
              {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
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
                value={formData.date_of_birth}
                onChange={(event) => handleChange('date_of_birth', event.target.value)}
                data-testid="input-date-of-birth"
              />
            </div>
            <div className="space-y-2">
              <Label>Nationality *</Label>
              <Select value={formData.nationality} onValueChange={(value) => handleChange('nationality', value)}>
                <SelectTrigger className={errors.nationality ? 'border-red-500' : ''} data-testid="select-nationality">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tanzania">Tanzania</SelectItem>
                  {/* Add more countries as needed */}
                </SelectContent>
              </Select>
              {errors.nationality && <p className="text-sm text-red-500">{errors.nationality}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nin">NIN</Label>
              <Input id="nin" value={formData.nin} onChange={(event) => handleChange('nin', event.target.value)} className={errors.nin ? 'border-red-500' : ''} data-testid="input-nin" />
              {errors.nin && <p className="text-sm text-red-500">{errors.nin}</p>}
            </div>
            <div className="space-y-2">
              <Label>Marital Status</Label>
              <Select value={formData.marital_status} onValueChange={(value) => handleChange('marital_status', value)}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_1">Primary Phone *</Label>
              <Input id="phone_1" value={formData.phone_1} onChange={(event) => handleChange('phone_1', event.target.value)} className={errors.phone_1 ? 'border-red-500' : ''} data-testid="input-phone-1" />
              {errors.phone_1 && <p className="text-sm text-red-500">{errors.phone_1}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_2">Secondary Phone</Label>
              <Input id="phone_2" value={formData.phone_2} onChange={(event) => handleChange('phone_2', event.target.value)} className={errors.phone_2 ? 'border-red-500' : ''} data-testid="input-phone-2" />
              {errors.phone_2 && <p className="text-sm text-red-500">{errors.phone_2}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={formData.email} onChange={(event) => handleChange('email', event.target.value)} className={errors.email ? 'border-red-500' : ''} data-testid="input-email" />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="physical_address">Physical Address *</Label>
              <Textarea id="physical_address" value={formData.physical_address} onChange={(event) => handleChange('physical_address', event.target.value)} rows={2} className={errors.physical_address ? 'border-red-500' : ''} data-testid="input-physical-address" />
              {errors.physical_address && <p className="text-sm text-red-500">{errors.physical_address}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="region_id">Region</Label>
              <Select value={formData.region_id} onValueChange={(value) => handleChange('region_id', value)} data-testid="select-region">
                <SelectTrigger disabled={regionsQuery.isLoading || regionsQuery.isError || regions.length === 0}>
                  <SelectValue placeholder={regionPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.region_name} ({r.zone_name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.employment_status} onValueChange={(value) => handleChange('employment_status', value)}>
                <SelectTrigger data-testid="select-employment-status">
                  <SelectValue />
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
              <Label htmlFor="job_title">Job Title</Label>
              <Select value={formData.job_title} onValueChange={(value) => handleChange('job_title', value)}>
                <SelectTrigger data-testid="select-job-title">
                  <SelectValue placeholder="Select job title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Security Guard">Security Guard</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Zone Manager">Zone Manager</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Officer">Officer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="education_background">Education Background</Label>
              <Textarea id="education_background" value={formData.education_background} onChange={(event) => handleChange('education_background', event.target.value)} rows={2} data-testid="input-education-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_joined">Date Joined *</Label>
              <Input id="date_joined" type="date" value={formData.date_joined} onChange={(event) => handleChange('date_joined', event.target.value)} className={errors.date_joined ? 'border-red-500' : ''} data-testid="input-date-joined" />
              {errors.date_joined && <p className="text-sm text-red-500">{errors.date_joined}</p>}
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={3} data-testid="input-notes" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to="/employees">
            <Button type="button" variant="outline" data-testid="btn-cancel">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createEmployee.isPending} className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-save">
            {createEmployee.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Employee</>}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeCreate;

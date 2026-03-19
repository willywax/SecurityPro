import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Loader2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

const EmployeeCreate = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
    postal_address: '',
    education_background: '',
    job_title: '',
    employment_status: 'active',
    hire_date: '',
    termination_date: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== '' && value !== null) {
          payload[key] = value;
        }
      }

      const response = await api.post('/employees', payload);
      toast.success(`Employee created with ID: ${response.data.employee_id}`);
      navigate(`/employees/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create employee';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="employee-create-page">
      {/* Header */}
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

      {/* Auto-generated IDs notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">Employee ID and Guard Number will be auto-generated</p>
          <p className="text-blue-700">The system will automatically assign unique IDs upon creation.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="John"
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
                value={formData.middle_name}
                onChange={(e) => handleChange('middle_name', e.target.value)}
                placeholder="William"
                data-testid="input-middle-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Doe"
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
                value={formData.gender}
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
                value={formData.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                data-testid="input-dob"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marital_status">Marital Status</Label>
              <Select
                value={formData.marital_status}
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
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                placeholder="Ugandan"
                data-testid="input-nationality"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nin">NIN (National ID)</Label>
              <Input
                id="nin"
                value={formData.nin}
                onChange={(e) => handleChange('nin', e.target.value)}
                placeholder="CM12345678ABCD"
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
                value={formData.phone_1}
                onChange={(e) => handleChange('phone_1', e.target.value)}
                placeholder="+256 700 123456"
                data-testid="input-phone-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_2">Secondary Phone</Label>
              <Input
                id="phone_2"
                type="tel"
                value={formData.phone_2}
                onChange={(e) => handleChange('phone_2', e.target.value)}
                placeholder="+256 700 654321"
                data-testid="input-phone-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john.doe@example.com"
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
                value={formData.physical_address}
                onChange={(e) => handleChange('physical_address', e.target.value)}
                placeholder="Plot 123, Main Street, Kampala"
                rows={2}
                data-testid="input-physical-address"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="postal_address">Postal Address</Label>
              <Input
                id="postal_address"
                value={formData.postal_address}
                onChange={(e) => handleChange('postal_address', e.target.value)}
                placeholder="P.O. Box 1234, Kampala"
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
                value={formData.job_title}
                onChange={(e) => handleChange('job_title', e.target.value)}
                placeholder="Security Guard"
                data-testid="input-job-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_status">Employment Status</Label>
              <Select
                value={formData.employment_status}
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
                value={formData.hire_date}
                onChange={(e) => handleChange('hire_date', e.target.value)}
                data-testid="input-hire-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termination_date">Termination Date</Label>
              <Input
                id="termination_date"
                type="date"
                value={formData.termination_date}
                onChange={(e) => handleChange('termination_date', e.target.value)}
                data-testid="input-termination-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education_background">Education Background</Label>
              <Input
                id="education_background"
                value={formData.education_background}
                onChange={(e) => handleChange('education_background', e.target.value)}
                placeholder="Secondary School"
                data-testid="input-education"
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about the employee..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link to="/employees">
            <Button type="button" variant="outline" data-testid="btn-cancel">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0F172A] hover:bg-slate-800"
            data-testid="btn-save"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeCreate;

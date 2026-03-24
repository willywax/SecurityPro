import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Search, Plus, ChevronLeft, ChevronRight, User, Phone, Mail, Loader2 } from 'lucide-react';
import employeeService from '@/services/employeeService';
import { API_BASE_URL } from '@/lib/api';

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

const EmployeeAvatar = ({ employee, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
  const background = colors[(employee.first_name?.charCodeAt(0) || 0) % colors.length];

  if (employee.profile_photo) {
    const src = employee.profile_photo.startsWith('http')
      ? employee.profile_photo
      : `${API_BASE_URL}${employee.profile_photo}`;

    return <img src={src} alt={employee.full_name} className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`} />;
  }

  return (
    <div className={`${sizeClasses[size]} ${background} rounded-full flex items-center justify-center flex-shrink-0`}>
      <span className="font-medium text-white">{initials}</span>
    </div>
  );
};

const EmployeeList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params);
  }, [page, search, setSearchParams, statusFilter]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employees', { page, pageSize, search: debouncedSearch, statusFilter }],
    queryFn: () =>
      employeeService.getAll({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        status_filter: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const employees = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6" data-testid="employees-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your workforce records</p>
        </div>
        <Link to="/employees/new">
          <Button className="bg-[#0F172A] hover:bg-slate-800" data-testid="btn-add-employee">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by name, phone, ID..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search-employees"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : isError ? (
        <Card className="border-red-200">
          <CardContent className="py-12 text-center text-red-600">
            {error?.response?.data?.detail || 'Failed to load employees'}
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">No employees found</h3>
            <p className="text-slate-500 text-sm mb-4">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first employee'}
            </p>
            {!search && statusFilter === 'all' && (
              <Link to="/employees/new">
                <Button className="bg-[#0F172A] hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">ID / Guard No</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Address</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    data-testid={`employee-row-${employee.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar employee={employee} size="md" />
                        <div>
                          <p className="font-medium text-slate-900">{employee.full_name}</p>
                          {employee.email && <p className="text-sm text-slate-500">{employee.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-slate-900">{employee.employee_id}</p>
                      {employee.guard_no && <p className="text-sm text-slate-500">Guard #{employee.guard_no}</p>}
                    </TableCell>
                    <TableCell>{employee.phone_1 ? <p className="text-slate-600">{employee.phone_1}</p> : '-'}</TableCell>
                    <TableCell className="text-slate-600">{employee.address || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[employee.employment_status]}>
                        {statusLabels[employee.employment_status] || employee.employment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {employees.map((employee) => (
              <Link key={employee.id} to={`/employees/${employee.id}`} className="block" data-testid={`employee-card-${employee.id}`}>
                <Card className="hover:border-slate-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <EmployeeAvatar employee={employee} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900 truncate">{employee.full_name}</p>
                            <p className="text-sm text-slate-500">{employee.employee_id}</p>
                          </div>
                          <Badge variant="outline" className={`${statusColors[employee.employment_status]} flex-shrink-0`}>
                            {statusLabels[employee.employment_status] || employee.employment_status}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-slate-600">{employee.address || '-'}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                            {employee.phone_1 && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {employee.phone_1}
                              </span>
                            )}
                            {employee.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="w-3.5 h-3.5" />
                                {employee.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} employees
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((value) => value - 1)} disabled={page <= 1} data-testid="btn-prev-page">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 min-w-[100px] text-center">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((value) => value + 1)} disabled={page >= totalPages} data-testid="btn-next-page">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeList;

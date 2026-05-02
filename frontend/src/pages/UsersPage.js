import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Search, ShieldCheck, UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import employeeService from '@/services/employeeService';
import userService from '@/services/userService';
import { formatApiError } from '@/utils/errors';
import { USER_MANAGEMENT_ROLES, USER_ROLE_LABELS, USER_ROLE_OPTIONS } from '@/constants/userRoles';
import { useAuth } from '@/context/AuthContext';
import EmployeeAutocomplete from '@/components/EmployeeAutocomplete';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'hr',
  employee_id: 'none',
  is_active: 'active',
};

const statusBadgeClass = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
};

const UsersPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const canManageUsers = USER_MANAGEMENT_ROLES.has(user?.role);

  const usersQuery = useQuery({
    queryKey: ['users', { search, roleFilter, statusFilter }],
    queryFn: () =>
      userService.getAll({
        search: search || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        page_size: 100,
      }),
    enabled: canManageUsers,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', 'user-options'],
    queryFn: () => employeeService.getAll({ page_size: 100, status_filter: 'active' }),
    enabled: canManageUsers,
  });

  const users = usersQuery.data?.data || [];
  const employees = employeesQuery.data?.data || [];

  const linkedEmployeeIds = useMemo(
    () => new Set(users.map((row) => row.employee_id).filter(Boolean)),
    [users],
  );

  const availableEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        if (editingUser?.employee_id && employee.id === editingUser.employee_id) {
          return true;
        }
        return !linkedEmployeeIds.has(employee.id);
      }),
    [editingUser?.employee_id, employees, linkedEmployeeIds],
  );

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingUser) {
        return userService.update(editingUser.id, payload);
      }
      return userService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editingUser ? 'User updated' : 'User created');
      setDialogOpen(false);
      setEditingUser(null);
      setForm(emptyForm);
    },
    onError: (error) => toast.error(formatApiError(error, 'Failed to save user')),
  });

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (selectedUser) => {
    setEditingUser(selectedUser);
    setForm({
      first_name: selectedUser.first_name || '',
      last_name: selectedUser.last_name || '',
      email: selectedUser.email || '',
      password: '',
      role: selectedUser.role || 'hr',
      employee_id: selectedUser.employee_id || 'none',
      is_active: selectedUser.is_active ? 'active' : 'inactive',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.role) {
      toast.error('First name, last name, email, and role are required');
      return;
    }

    if (!editingUser && form.password.trim().length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: form.role,
      employee_id: form.employee_id === 'none' ? null : form.employee_id,
      is_active: form.is_active === 'active',
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    saveMutation.mutate(payload);
  };

  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-900">Access restricted</h1>
          <p className="mt-2 text-sm text-slate-500">Only Admin and Director accounts can manage users.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users Management</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage the accounts that can access the platform.</p>
        </div>
        <Button className="bg-[#0F172A] hover:bg-slate-800" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {USER_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">System Users</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : usersQuery.isError ? (
            <div className="py-8 text-center text-sm text-red-600">
              {formatApiError(usersQuery.error, 'Failed to load users')}
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <UserCog className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h2 className="text-lg font-medium text-slate-900">No users found</h2>
              <p className="mt-2 text-sm text-slate-500">Create the first account for your team from here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Linked Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">
                            {row.first_name} {row.last_name}
                          </p>
                          <p className="text-sm text-slate-500">{row.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{USER_ROLE_LABELS[row.role] || row.role}</TableCell>
                      <TableCell>{row.employee_name || 'Not linked'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass[row.is_active ? 'active' : 'inactive']}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.last_login ? new Date(row.last_login).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(row)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit user' : 'Create user'}</DialogTitle>
            <DialogDescription>
              Assign a role and optionally link this account to an employee record.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{editingUser ? 'Reset Password' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked Employee</Label>
              <EmployeeAutocomplete
                employees={availableEmployees}
                value={form.employee_id}
                onValueChange={(value) => setForm((current) => ({ ...current, employee_id: value }))}
                placeholder="Optional employee link"
                includeNone
                noneValue="none"
                noneLabel="No linked employee"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.is_active}
                onValueChange={(value) => setForm((current) => ({ ...current, is_active: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingUser(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
              <Button className="bg-[#0F172A] hover:bg-slate-800" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;

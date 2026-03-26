export const USER_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Director' },
  { value: 'hr', label: 'HR' },
  { value: 'zone_manager', label: 'Zone Manager' },
];

export const USER_ROLE_LABELS = {
  admin: 'Admin',
  director: 'Director',
  hr: 'HR',
  zone_manager: 'Zone Manager',
  manager: 'Manager',
  supervisor: 'Supervisor',
  guard: 'Guard',
  viewer: 'Viewer',
};

export const USER_MANAGEMENT_ROLES = new Set(['admin', 'director']);

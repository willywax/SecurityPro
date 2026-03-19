import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  Package,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Clients', href: '/clients', icon: Building2 },
  { name: 'Sites', href: '/sites', icon: MapPin },
  { name: 'Assets', href: '/assets', icon: Package },
  { name: 'Payroll', href: '/payroll', icon: DollarSign },
  { name: 'Invoices', href: '/invoices', icon: FileText },
];

const Sidebar = ({ onClose }) => {
  const { user, organization, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300" data-testid="sidebar">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-white font-semibold text-sm truncate">
            {organization?.name || 'SecureOps'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-700/70 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              )
            }
            data-testid={`nav-${item.name.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-700/50 p-3">
        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1',
              isActive
                ? 'bg-slate-700/70 text-white'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
            )
          }
          data-testid="nav-settings"
        >
          <Settings className="w-5 h-5" />
          Settings
        </NavLink>

        {/* User Info & Logout */}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Sign out"
              data-testid="btn-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

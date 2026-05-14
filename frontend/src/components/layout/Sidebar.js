import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  Store,
  Package,
  PackageCheck,
  TrendingDown,
  Tag,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Globe,
  Map,
  UserCog,
  ArrowRightLeft,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { USER_MANAGEMENT_ROLES } from '@/constants/userRoles';

const assetsSubNav = [
  { name: 'Store', href: '/store', icon: Store },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Issuances', href: '/issuances', icon: PackageCheck },
  { name: 'Write-off Register', href: '/write-offs', icon: TrendingDown },
  { name: 'Asset Types', href: '/asset-types', icon: Tag },
];

// allAccess: true = visible to all roles
// zoneManager: true = visible to zone managers
const topNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, allAccess: true, zoneManager: true },
  { name: 'Employees', href: '/employees', icon: Users, allAccess: true, zoneManager: true },
  { name: 'Clients', href: '/clients', icon: Building2, allAccess: true, zoneManager: true },
  { name: 'Sites', href: '/sites', icon: MapPin, allAccess: true, zoneManager: true },
  { name: 'Zones', href: '/zones', icon: Globe, allAccess: true, zoneManager: false },
  { name: 'Regions', href: '/regions', icon: Map, allAccess: true, zoneManager: false },
  { name: 'Allocations', href: '/allocations', icon: ArrowRightLeft, allAccess: true, zoneManager: true },
  { name: 'Daily Logs', href: '/daily-logs', icon: ClipboardList, allAccess: true, zoneManager: true },
  { name: 'Reports', href: '/reports/employees', icon: BarChart3, allAccess: true, zoneManager: true },
];

const bottomNavigation = [
  { name: 'Payroll', href: '/payroll', icon: DollarSign, allAccess: true, zoneManager: false },
  { name: 'Invoices', href: '/invoices', icon: FileText, allAccess: true, zoneManager: false },
];

const Sidebar = ({ onClose }) => {
  const { user, organization, logout } = useAuth();
  const location = useLocation();
  const isAssetsActive = assetsSubNav.some(item => location.pathname.startsWith(item.href));
  const [assetsOpen, setAssetsOpen] = useState(isAssetsActive);
  const canManageUsers = USER_MANAGEMENT_ROLES.has(user?.role);
  const isZoneManager = user?.role === 'zone_manager';

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
  };

  const navLinkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-slate-700/70 text-white'
        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
    );

  const visibleTopNav = topNavigation.filter(item =>
    isZoneManager ? item.zoneManager : item.allAccess
  );
  const visibleBottomNav = bottomNavigation.filter(item =>
    isZoneManager ? item.zoneManager : item.allAccess
  );

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300" data-testid="sidebar">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <img src={organization.logo_url} alt={organization.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-white font-semibold text-sm truncate">Opsys</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleTopNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={navLinkClass}
            data-testid={`nav-${item.name.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}

        {/* Assets section — hidden for zone managers */}
        {!isZoneManager && (
          <div>
            <button
              onClick={() => setAssetsOpen(o => !o)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isAssetsActive
                  ? 'bg-slate-700/70 text-white'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              )}
            >
              <Package className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">Assets</span>
              <ChevronDown className={cn('w-4 h-4 transition-transform', assetsOpen ? 'rotate-180' : '')} />
            </button>

            {assetsOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700/50 pl-3">
                {assetsSubNav.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-slate-700/70 text-white'
                          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                      )
                    }
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleBottomNav.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onClose}
            className={navLinkClass}
            data-testid={`nav-${item.name.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}

        {canManageUsers && (
          <NavLink
            to="/users"
            onClick={onClose}
            className={navLinkClass}
            data-testid="nav-users"
          >
            <UserCog className="w-5 h-5 flex-shrink-0" />
            Users
          </NavLink>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-700/50 p-3">
        {!isZoneManager && (
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
        )}

        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
              title="Sign out"
              data-testid="btn-logout"
              aria-label="Sign out"
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

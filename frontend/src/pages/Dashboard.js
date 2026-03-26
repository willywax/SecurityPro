import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Users, 
  Building2, 
  MapPin, 
  Package, 
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  UserCog,
} from 'lucide-react';
import dashboardService from '@/services/dashboardService';
import { USER_MANAGEMENT_ROLES } from '@/constants/userRoles';

const activityIconMap = {
  employee: { icon: CheckCircle, containerClass: 'bg-emerald-100', iconClass: 'text-emerald-600' },
  client: { icon: CheckCircle, containerClass: 'bg-emerald-100', iconClass: 'text-emerald-600' },
  site: { icon: Clock, containerClass: 'bg-blue-100', iconClass: 'text-blue-600' },
  asset: { icon: AlertTriangle, containerClass: 'bg-amber-100', iconClass: 'text-amber-600' },
};

const formatRelativeTime = (value) => {
  const target = new Date(value);
  const diffMs = target.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
};

const Dashboard = () => {
  const { user, organization } = useAuth();
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardService.getSummary(),
  });

  const stats = dashboardQuery.data?.stats;
  const recentActivities = dashboardQuery.data?.recent_activity || [];
  const canManageUsers = USER_MANAGEMENT_ROLES.has(user?.role);

  const statsData = [
    { name: 'Total Employees', value: stats?.total_employees ?? 0, helper: `${stats?.active_employees ?? 0} active`, icon: Users },
    { name: 'Active Clients', value: stats?.active_clients ?? 0, helper: 'Live client accounts', icon: Building2 },
    { name: 'Sites Covered', value: stats?.active_sites ?? 0, helper: 'Currently active sites', icon: MapPin },
    { name: 'Assets Issued', value: stats?.outstanding_assets ?? 0, helper: 'Outstanding issued units', icon: Package },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          Welcome back, {user?.first_name}!
        </h2>
        <p className="text-slate-500">
          Here's what's happening at {organization?.name || 'your organization'} today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <Card key={stat.name} className="border-slate-200" data-testid={`stat-${stat.name.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-slate-600" />
                </div>
                {dashboardQuery.isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : null}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.name}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.helper}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-slate-200" data-testid="recent-activity">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
            <CardDescription>Latest updates from your operations</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : recentActivities.length === 0 ? (
              <p className="py-8 text-sm text-slate-500">No recent activity yet.</p>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const iconConfig = activityIconMap[activity.type] || activityIconMap.site;
                  const ActivityIcon = iconConfig.icon;

                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${iconConfig.containerClass}`}>
                        <ActivityIcon className={`w-3.5 h-3.5 ${iconConfig.iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                        <p className="text-sm text-slate-600">{activity.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatRelativeTime(activity.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200" data-testid="quick-actions">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
            <CardDescription>Frequently used operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Add Employee', icon: Users, href: '/employees/new' },
                { name: 'New Client', icon: Building2, href: '/clients/new' },
                { name: 'Create Invoice', icon: TrendingUp, href: '/invoices/new' },
                { name: 'Issue Asset', icon: Package, href: '/issuances' },
                ...(canManageUsers ? [{ name: 'Manage Users', icon: UserCog, href: '/users' }] : []),
              ].map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                  data-testid={`action-${action.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center">
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">{action.name}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for future modules */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-500">Active Users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats?.active_users ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">Accounts currently enabled for access</p>
        </div>
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 lg:col-span-2">
          <p className="text-sm font-medium text-slate-900">More dashboard widgets can plug in here next.</p>
          <p className="mt-2 text-sm text-slate-500">
            Payroll summary, overdue contracts, invoice collections, and zone performance are good next candidates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

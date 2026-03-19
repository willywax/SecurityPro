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
  CheckCircle
} from 'lucide-react';

const statsData = [
  { name: 'Total Employees', value: '156', change: '+12%', icon: Users, trend: 'up' },
  { name: 'Active Clients', value: '24', change: '+3', icon: Building2, trend: 'up' },
  { name: 'Sites Covered', value: '38', change: '+5', icon: MapPin, trend: 'up' },
  { name: 'Assets Issued', value: '234', change: '-2%', icon: Package, trend: 'down' },
];

const recentActivities = [
  { id: 1, type: 'success', message: 'New employee John Doe added', time: '2 hours ago' },
  { id: 2, type: 'warning', message: 'Asset return overdue - Radio #R45', time: '4 hours ago' },
  { id: 3, type: 'success', message: 'Invoice #INV-2024-089 paid', time: '6 hours ago' },
  { id: 4, type: 'info', message: 'Payroll processing complete', time: '1 day ago' },
];

const Dashboard = () => {
  const { user, organization } = useAuth();

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
                <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.name}</p>
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
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'success' ? 'bg-emerald-100' :
                    activity.type === 'warning' ? 'bg-amber-100' :
                    'bg-blue-100'
                  }`}>
                    {activity.type === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    {activity.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    {activity.type === 'info' && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{activity.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
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
                { name: 'Add Employee', icon: Users },
                { name: 'New Client', icon: Building2 },
                { name: 'Create Invoice', icon: TrendingUp },
                { name: 'Issue Asset', icon: Package },
              ].map((action) => (
                <button
                  key={action.name}
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                  data-testid={`action-${action.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center">
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-slate-900">{action.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for future modules */}
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="text-slate-500 text-sm">
          More dashboard widgets coming soon: Shift Calendar, Payroll Summary, Site Map, and more.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;

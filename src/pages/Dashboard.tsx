import { useNavigate } from 'react-router-dom';
import {
  Building2,
  DoorOpen,
  TrendingUp,
  DollarSign,
  Wrench,
  Users,
  Calendar,
  AlertCircle,
  CreditCard,
  ClipboardList,
  FileText,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useDataStore } from '../store/useDataStore';
import { recentActivities } from '../data/mock';

const activityIcons: Record<string, typeof CreditCard> = {
  payment: CreditCard,
  maintenance: ClipboardList,
  lease: FileText,
  contact: UserPlus,
  campaign: BarChart3,
};

const activityRoutes: Record<string, string> = {
  payment: '/tenants',
  maintenance: '/maintenance',
  lease: '/tenants',
  contact: '/crm',
  campaign: '/marketing',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { properties, tenants, maintenanceRequests } = useDataStore();

  const dashboardMetrics = {
    totalProperties: properties.length,
    totalUnits: properties.reduce((sum, p) => sum + p.units, 0),
    occupancyRate: properties.length > 0 ? Math.round(properties.reduce((sum, p) => sum + p.occupancyRate, 0) / properties.length) : 0,
    monthlyRevenue: properties.reduce((sum, p) => sum + p.monthlyRevenue, 0),
    openMaintenanceRequests: maintenanceRequests.filter((m) => m.status === 'open' || m.status === 'in_progress').length,
    activeTenants: tenants.filter((t) => t.status === 'active').length,
    upcomingLeaseExpirations: tenants.filter((t) => {
      const end = new Date(t.leaseEnd);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
    }).length,
    outstandingBalance: tenants.reduce((sum, t) => sum + t.balance, 0),
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">
          Overview of your property management portfolio
        </p>
      </div>

      {/* Metrics grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Properties"
          value={dashboardMetrics.totalProperties}
          change="+1 this month"
          changeType="positive"
          icon={<Building2 className="w-5 h-5" />}
          onClick={() => navigate('/properties')}
        />
        <MetricCard
          title="Occupancy"
          value={`${dashboardMetrics.occupancyRate}%`}
          change="+2.1% vs last month"
          changeType="positive"
          icon={<DoorOpen className="w-5 h-5" />}
          onClick={() => navigate('/properties')}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${dashboardMetrics.monthlyRevenue.toLocaleString()}`}
          change="+$4,200 vs last month"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5" />}
          onClick={() => navigate('/properties')}
        />
        <MetricCard
          title="Open Requests"
          value={dashboardMetrics.openMaintenanceRequests}
          change="2 urgent"
          changeType="negative"
          icon={<Wrench className="w-5 h-5" />}
          onClick={() => navigate('/maintenance')}
        />
      </div>

      {/* Second metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Active Tenants"
          value={dashboardMetrics.activeTenants}
          icon={<Users className="w-5 h-5" />}
          onClick={() => navigate('/tenants')}
        />
        <MetricCard
          title="Lease Expirations"
          value={dashboardMetrics.upcomingLeaseExpirations}
          change="Next 90 days"
          changeType="neutral"
          icon={<Calendar className="w-5 h-5" />}
          onClick={() => navigate('/tenants')}
        />
        <MetricCard
          title="Outstanding"
          value={`$${dashboardMetrics.outstandingBalance.toLocaleString()}`}
          change="1 delinquent"
          changeType="negative"
          icon={<AlertCircle className="w-5 h-5" />}
          onClick={() => navigate('/tenants')}
        />
        <MetricCard
          title="Total Units"
          value={dashboardMetrics.totalUnits}
          change={`${dashboardMetrics.occupancyRate}% occupied`}
          changeType="positive"
          icon={<TrendingUp className="w-5 h-5" />}
          onClick={() => navigate('/properties')}
        />
      </div>

      {/* Activity + Properties */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-3 card">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivities.map((activity) => {
              const Icon = activityIcons[activity.type] || ClipboardList;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-surface-tertiary rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => navigate(activityRoutes[activity.type] ?? '/')}
                >
                  <div className="p-1.5 rounded-md bg-surface-tertiary flex-shrink-0">
                    <Icon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{activity.description}</p>
                  </div>
                  <time className="text-xs text-text-muted flex-shrink-0 hidden sm:block">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </time>
                </div>
              );
            })}
          </div>
        </div>

        {/* Property Overview */}
        <div className="lg:col-span-2 card">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary mb-4">Properties</h2>
          <div className="space-y-3">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-surface-tertiary rounded-lg px-2 -mx-2 transition-colors" onClick={() => navigate('/properties')}>
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{property.name}</p>
                  <p className="text-xs text-text-muted">{property.units} units · {property.occupancyRate}%</p>
                </div>
                <StatusBadge status={property.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

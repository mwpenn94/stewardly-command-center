import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';

interface Insight {
  type: 'opportunity' | 'warning' | 'recommendation';
  title: string;
  description: string;
  action?: string;
}

export default function AIInsights() {
  const { properties, tenants, maintenanceRequests, contacts } = useDataStore();

  // Generate insights based on actual data
  const insights: Insight[] = [];

  const lateTenants = tenants.filter((t) => t.status === 'late');
  if (lateTenants.length > 0) {
    insights.push({
      type: 'warning',
      title: `${lateTenants.length} tenant${lateTenants.length > 1 ? 's' : ''} with overdue payments`,
      description: `$${lateTenants.reduce((s, t) => s + t.balance, 0).toLocaleString()} outstanding. Consider automated payment reminders.`,
      action: 'View Tenants',
    });
  }

  const urgentMaintenance = maintenanceRequests.filter((m) => m.priority === 'urgent' && m.status !== 'completed');
  if (urgentMaintenance.length > 0) {
    insights.push({
      type: 'warning',
      title: `${urgentMaintenance.length} urgent maintenance request${urgentMaintenance.length > 1 ? 's' : ''} open`,
      description: 'Urgent requests impact tenant satisfaction scores. Prioritize resolution.',
      action: 'View Maintenance',
    });
  }

  const lowOccupancy = properties.filter((p) => p.occupancyRate < 85);
  if (lowOccupancy.length > 0) {
    insights.push({
      type: 'opportunity',
      title: `${lowOccupancy.length} propert${lowOccupancy.length > 1 ? 'ies' : 'y'} below 85% occupancy`,
      description: `${lowOccupancy.map((p) => p.name).join(', ')} — consider targeted marketing campaigns.`,
      action: 'Create Campaign',
    });
  }

  const newLeads = contacts.filter((c) => c.status === 'new');
  if (newLeads.length > 0) {
    insights.push({
      type: 'recommendation',
      title: `${newLeads.length} new lead${newLeads.length > 1 ? 's' : ''} awaiting contact`,
      description: 'Leads contacted within 24h have 3x higher conversion rates. Consider setting up automated welcome workflows.',
      action: 'View CRM',
    });
  }

  const avgOccupancy = properties.length > 0 ? Math.round(properties.reduce((s, p) => s + p.occupancyRate, 0) / properties.length) : 0;
  if (avgOccupancy > 90) {
    insights.push({
      type: 'opportunity',
      title: 'Strong occupancy — consider rent optimization',
      description: `Average occupancy is ${avgOccupancy}%. Market analysis suggests a 3-5% rent increase may be sustainable.`,
    });
  }

  const expiringLeases = tenants.filter((t) => {
    const end = new Date(t.leaseEnd);
    const diff = end.getTime() - Date.now();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
  });
  if (expiringLeases.length > 0) {
    insights.push({
      type: 'recommendation',
      title: `${expiringLeases.length} lease${expiringLeases.length > 1 ? 's' : ''} expiring within 60 days`,
      description: 'Start renewal conversations early to reduce turnover costs.',
      action: 'View Tenants',
    });
  }

  const typeIcons = {
    opportunity: TrendingUp,
    warning: AlertTriangle,
    recommendation: Lightbulb,
  };

  const typeColors = {
    opportunity: 'bg-accent-50 text-accent-600',
    warning: 'bg-amber-50 text-amber-600',
    recommendation: 'bg-primary-50 text-primary-600',
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary-500" />
        <h2 className="text-base sm:text-lg font-semibold text-text-primary">AI Insights</h2>
      </div>
      <div className="space-y-3">
        {insights.slice(0, 5).map((insight, idx) => {
          const Icon = typeIcons[insight.type];
          return (
            <div key={idx} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className={`p-1.5 rounded-md flex-shrink-0 ${typeColors[insight.type]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{insight.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{insight.description}</p>
              </div>
              {insight.action && (
                <button className="flex items-center gap-0.5 text-xs text-primary-600 font-medium flex-shrink-0 hover:underline">
                  {insight.action} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {insights.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">No insights available — all metrics look healthy.</p>
        )}
      </div>
    </div>
  );
}

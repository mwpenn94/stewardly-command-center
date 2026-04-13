import { useState } from 'react';
import { Plus, Search, Mail, Share2, MessageSquare, Printer, Monitor, TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import StatusBadge from '../components/ui/StatusBadge';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import CampaignForm from '../components/marketing/CampaignForm';
import { useDataStore } from '../store/useDataStore';
import type { Campaign } from '../types';

const typeIcons: Record<string, typeof Mail> = {
  email: Mail,
  social: Share2,
  sms: MessageSquare,
  print: Printer,
  digital_ad: Monitor,
};

export default function Marketing() {
  const { campaigns, addCampaign, updateCampaign } = useDataStore();
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>();

  const filtered = campaigns.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.audience.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);

  const handleCreate = (data: Omit<Campaign, 'id' | 'createdAt'>) => {
    addCampaign(data);
    setFormOpen(false);
    addToast('success', `Campaign "${data.name}" created`);
  };

  const handleUpdate = (data: Omit<Campaign, 'id' | 'createdAt'>) => {
    if (editing) {
      updateCampaign(editing.id, data);
      setEditing(undefined);
      addToast('success', `Campaign "${data.name}" updated`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        subtitle="Campaigns, outreach, and performance across all channels"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </button>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Total Reach" value={totalReach.toLocaleString()} icon={<Users className="w-5 h-5" />} />
        <MetricCard
          title="Conversions"
          value={totalConversions}
          change={`${((totalConversions / Math.max(totalReach, 1)) * 100).toFixed(1)}% rate`}
          changeType="positive"
          icon={<Target className="w-5 h-5" />}
        />
        <MetricCard
          title="Budget Used"
          value={`$${totalSpent.toLocaleString()}`}
          change={`of $${totalBudget.toLocaleString()} total`}
          changeType="neutral"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard title="Active Campaigns" value={campaigns.filter((c) => c.status === 'active').length} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Search campaigns"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'active', 'scheduled', 'draft', 'completed', 'paused'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((campaign: Campaign) => {
          const TypeIcon = typeIcons[campaign.type] || Mail;
          const budgetPercent = campaign.budget > 0
            ? Math.round((campaign.spent / campaign.budget) * 100)
            : 0;
          return (
            <div
              key={campaign.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEditing(campaign)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary-50 flex-shrink-0">
                    <TypeIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{campaign.name}</h3>
                    <p className="text-xs text-text-muted">{campaign.audience}</p>
                  </div>
                </div>
                <StatusBadge status={campaign.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs text-text-muted">Reach</p>
                  <p className="text-sm font-semibold">{campaign.reach.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Engagement</p>
                  <p className="text-sm font-semibold">{campaign.engagement.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Conversions</p>
                  <p className="text-sm font-semibold">{campaign.conversions}</p>
                </div>
              </div>

              {campaign.budget > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Budget</span>
                    <span>${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-amber-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between text-xs text-text-muted mt-3 pt-3 border-t border-border">
                <span>{new Date(campaign.startDate).toLocaleDateString()}</span>
                {campaign.endDate && <span>— {new Date(campaign.endDate).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No campaigns match your filters</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(undefined); }}
        title={editing ? 'Edit Campaign' : 'New Campaign'}
        size="lg"
      >
        <CampaignForm
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        />
      </Modal>
    </div>
  );
}

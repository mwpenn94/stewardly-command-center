import { useState } from 'react';
import { Plus, Search, Mail, Share2, MessageSquare, Printer, Monitor, TrendingUp, DollarSign, Users, Target, Zap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../components/ui/Toast';
import StatusBadge from '../components/ui/StatusBadge';
import MetricCard from '../components/ui/MetricCard';
import Modal from '../components/ui/Modal';
import CampaignForm from '../components/marketing/CampaignForm';
import EmailTemplateBuilder from '../components/marketing/EmailTemplateBuilder';
import WorkflowBuilder from '../components/marketing/WorkflowBuilder';
import { useDataStore } from '../store/useDataStore';
import type { Campaign } from '../types';
import type { WorkflowStep, OutreachWorkflow } from '../types/workflow';

const typeIcons: Record<string, typeof Mail> = {
  email: Mail,
  social: Share2,
  sms: MessageSquare,
  print: Printer,
  digital_ad: Monitor,
};

type Tab = 'campaigns' | 'email-builder' | 'workflows';

const mockWorkflows: OutreachWorkflow[] = [
  {
    id: 'wf1',
    name: 'New Lead Welcome Sequence',
    trigger: 'new_lead',
    status: 'active',
    steps: [
      { id: 's1', type: 'email', config: { template: 'Welcome email' } },
      { id: 's2', type: 'wait', config: { delayDays: 3 } },
      { id: 's3', type: 'email', config: { template: 'Property showcase' } },
      { id: 's4', type: 'wait', config: { delayDays: 7 } },
      { id: 's5', type: 'condition', config: { condition: 'opened_last_email = true' } },
      { id: 's6', type: 'email', config: { template: 'Schedule a tour' } },
    ],
    enrolledCount: 24,
    completedCount: 8,
    createdAt: '2025-03-15',
  },
  {
    id: 'wf2',
    name: 'Lease Expiration Reminder',
    trigger: 'lease_expiring',
    status: 'active',
    steps: [
      { id: 's7', type: 'email', config: { template: '90-day notice' } },
      { id: 's8', type: 'wait', config: { delayDays: 30 } },
      { id: 's9', type: 'email', config: { template: '60-day renewal offer' } },
      { id: 's10', type: 'wait', config: { delayDays: 30 } },
      { id: 's11', type: 'sms', config: { message: 'Your lease expires in 30 days. Reply to schedule a renewal meeting.' } },
    ],
    enrolledCount: 5,
    completedCount: 2,
    createdAt: '2025-02-01',
  },
];

export default function Marketing() {
  const { campaigns, addCampaign, updateCampaign } = useDataStore();
  const { addToast } = useToast();
  const [tab, setTab] = useState<Tab>('campaigns');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | undefined>();
  const [workflows, setWorkflows] = useState<OutreachWorkflow[]>(mockWorkflows);
  const [editingWorkflow, setEditingWorkflow] = useState<OutreachWorkflow | null>(null);

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
          tab === 'campaigns' ? (
            <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Campaign</span>
              <span className="sm:hidden">New</span>
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { id: 'campaigns' as Tab, label: 'Campaigns' },
          { id: 'email-builder' as Tab, label: 'Email Builder' },
          { id: 'workflows' as Tab, label: 'Workflows' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              tab === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <>
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

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="search" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" aria-label="Search campaigns" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['all', 'active', 'scheduled', 'draft', 'completed', 'paused'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === status ? 'bg-primary-600 text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((campaign: Campaign) => {
              const TypeIcon = typeIcons[campaign.type] || Mail;
              const budgetPercent = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;
              return (
                <div key={campaign.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEditing(campaign)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary-50 flex-shrink-0"><TypeIcon className="w-5 h-5 text-primary-600" /></div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-text-primary truncate">{campaign.name}</h3>
                        <p className="text-xs text-text-muted">{campaign.audience}</p>
                      </div>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div><p className="text-xs text-text-muted">Reach</p><p className="text-sm font-semibold">{campaign.reach.toLocaleString()}</p></div>
                    <div><p className="text-xs text-text-muted">Engagement</p><p className="text-sm font-semibold">{campaign.engagement.toLocaleString()}</p></div>
                    <div><p className="text-xs text-text-muted">Conversions</p><p className="text-sm font-semibold">{campaign.conversions}</p></div>
                  </div>
                  {campaign.budget > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-text-muted mb-1"><span>Budget</span><span>${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}</span></div>
                      <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-amber-500' : 'bg-primary-500'}`} style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
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
            <div className="card text-center py-12"><TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" /><p className="text-text-muted">No campaigns match your filters</p></div>
          )}
        </>
      )}

      {/* Email Builder Tab */}
      {tab === 'email-builder' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Email Template Builder</h2>
          <EmailTemplateBuilder
            onSend={(template) => {
              addToast('success', `Email "${template.subject || 'Untitled'}" queued for sending`);
            }}
          />
        </div>
      )}

      {/* Workflows Tab */}
      {tab === 'workflows' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workflows.map((wf) => (
              <div key={wf.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEditingWorkflow(wf)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-50 flex-shrink-0">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">{wf.name}</h3>
                      <p className="text-xs text-text-muted capitalize">Trigger: {wf.trigger.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <StatusBadge status={wf.status} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-xs text-text-muted">Steps</p><p className="text-sm font-semibold">{wf.steps.length}</p></div>
                  <div><p className="text-xs text-text-muted">Enrolled</p><p className="text-sm font-semibold">{wf.enrolledCount}</p></div>
                  <div><p className="text-xs text-text-muted">Completed</p><p className="text-sm font-semibold">{wf.completedCount}</p></div>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              const newWf: OutreachWorkflow = {
                id: `wf-${Date.now()}`,
                name: 'New Workflow',
                trigger: 'manual',
                status: 'draft',
                steps: [],
                enrolledCount: 0,
                completedCount: 0,
                createdAt: new Date().toISOString().split('T')[0],
              };
              setWorkflows((prev) => [...prev, newWf]);
              setEditingWorkflow(newWf);
            }}
          >
            <Plus className="w-4 h-4" /> New Workflow
          </button>
        </div>
      )}

      {/* Campaign Create/Edit Modal */}
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

      {/* Workflow Edit Modal */}
      <Modal
        open={!!editingWorkflow}
        onClose={() => setEditingWorkflow(null)}
        title={editingWorkflow?.name ?? 'Workflow'}
        size="lg"
      >
        {editingWorkflow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                <input
                  className="input"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Trigger</label>
                <select
                  className="input"
                  value={editingWorkflow.trigger}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, trigger: e.target.value as OutreachWorkflow['trigger'] })}
                >
                  <option value="new_lead">New Lead</option>
                  <option value="lease_expiring">Lease Expiring</option>
                  <option value="payment_overdue">Payment Overdue</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
            <WorkflowBuilder
              steps={editingWorkflow.steps}
              onChange={(steps: WorkflowStep[]) => setEditingWorkflow({ ...editingWorkflow, steps })}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button className="btn-secondary" onClick={() => setEditingWorkflow(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  setWorkflows((prev) => prev.map((w) => (w.id === editingWorkflow.id ? editingWorkflow : w)));
                  addToast('success', `Workflow "${editingWorkflow.name}" saved`);
                  setEditingWorkflow(null);
                }}
              >
                Save Workflow
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

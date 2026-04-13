import { useState } from 'react';
import { Plus, Search, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { maintenanceRequests, properties, tenants } from '../data/mock';
import type { MaintenanceRequest } from '../types';

const priorityColors: Record<string, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-primary-500',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

const statusIcons: Record<string, typeof Clock> = {
  open: AlertTriangle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export default function Maintenance() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = maintenanceRequests.filter((m) => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesSearch =
      search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getPropertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? 'Unknown';
  const getTenantName = (id: string) => {
    const t = tenants.find((t) => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
  };

  const counts = {
    open: maintenanceRequests.filter((m) => m.status === 'open').length,
    in_progress: maintenanceRequests.filter((m) => m.status === 'in_progress').length,
    completed: maintenanceRequests.filter((m) => m.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle={`${counts.open} open, ${counts.in_progress} in progress`}
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Request</span>
            <span className="sm:hidden">New</span>
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Search maintenance requests"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'open', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {filtered.map((req: MaintenanceRequest) => {
          const StatusIcon = statusIcons[req.status] || Clock;
          return (
            <div
              key={req.id}
              className={`card border-l-4 ${priorityColors[req.priority]} cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-1.5 rounded-md bg-surface-tertiary flex-shrink-0 mt-0.5">
                    <StatusIcon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-text-primary">{req.title}</h3>
                      <StatusBadge status={req.priority} />
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-sm text-text-muted mt-1 line-clamp-1">{req.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-muted">
                      <span>{getPropertyName(req.propertyId)}</span>
                      <span>{getTenantName(req.tenantId)}</span>
                      <span>{req.category}</span>
                      {req.assignedTo && <span>Assigned: {req.assignedTo}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-text-muted flex-shrink-0 sm:text-right">
                  <p>Created {new Date(req.createdAt).toLocaleDateString()}</p>
                  <p>Updated {new Date(req.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-accent-500 mx-auto mb-3" />
          <p className="text-text-muted">No maintenance requests match your filters</p>
        </div>
      )}
    </div>
  );
}

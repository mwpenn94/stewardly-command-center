import { useState } from 'react';
import { Plus, Search, Mail, Phone } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import { tenants, properties } from '../data/mock';
import type { Tenant } from '../types';

export default function Tenants() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = tenants.filter((t) => {
    const matchesSearch =
      search === '' ||
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name ?? 'Unknown';
  };

  const columns = [
    {
      key: 'name',
      header: 'Tenant',
      render: (t: Tenant) => (
        <div>
          <p className="font-medium text-text-primary">{t.firstName} {t.lastName}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Mail className="w-3 h-3" /> {t.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'property',
      header: 'Property',
      hideOnMobile: true,
      render: (t: Tenant) => (
        <div>
          <p className="text-sm">{getPropertyName(t.propertyId)}</p>
          <p className="text-xs text-text-muted">Unit {t.unitNumber}</p>
        </div>
      ),
    },
    {
      key: 'lease',
      header: 'Lease',
      hideOnMobile: true,
      render: (t: Tenant) => (
        <div className="text-sm">
          <p>{new Date(t.leaseStart).toLocaleDateString()} —</p>
          <p>{new Date(t.leaseEnd).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'rent',
      header: 'Rent',
      render: (t: Tenant) => (
        <div>
          <p className="text-sm font-medium">${t.monthlyRent.toLocaleString()}/mo</p>
          {t.balance > 0 && (
            <p className="text-xs text-red-600 font-medium">${t.balance.toLocaleString()} due</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: Tenant) => <StatusBadge status={t.status} />,
    },
    {
      key: 'actions',
      header: '',
      hideOnMobile: true,
      render: (t: Tenant) => (
        <div className="flex gap-2">
          <button
            className="p-1.5 rounded-md hover:bg-surface-tertiary"
            aria-label={`Email ${t.firstName}`}
          >
            <Mail className="w-4 h-4 text-text-muted" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-surface-tertiary"
            aria-label={`Call ${t.firstName}`}
          >
            <Phone className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.length} total tenants across your properties`}
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Tenant</span>
            <span className="sm:hidden">Add</span>
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Search tenants"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'active', 'late', 'pending', 'former'].map((status) => (
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

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(t) => t.id}
        emptyMessage="No tenants match your search"
      />
    </div>
  );
}

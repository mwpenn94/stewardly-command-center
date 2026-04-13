import { useState } from 'react';
import { Plus, Search, Mail, Phone } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import TenantForm from '../components/tenants/TenantForm';
import { useDataStore } from '../store/useDataStore';
import type { Tenant } from '../types';

export default function Tenants() {
  const { tenants, properties, addTenant, updateTenant } = useDataStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | undefined>();
  const [detailTenant, setDetailTenant] = useState<Tenant | undefined>();

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

  const handleCreate = (data: Omit<Tenant, 'id'>) => {
    addTenant(data);
    setFormOpen(false);
  };

  const handleUpdate = (data: Omit<Tenant, 'id'>) => {
    if (editing) {
      updateTenant(editing.id, data);
      setEditing(undefined);
    }
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
          <button className="p-1.5 rounded-md hover:bg-surface-tertiary" aria-label={`Email ${t.firstName}`}>
            <Mail className="w-4 h-4 text-text-muted" />
          </button>
          <button className="p-1.5 rounded-md hover:bg-surface-tertiary" aria-label={`Call ${t.firstName}`}>
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
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
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
        onRowClick={(t) => setDetailTenant(t)}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(undefined); }}
        title={editing ? 'Edit Tenant' : 'Add Tenant'}
        size="lg"
      >
        <TenantForm
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailTenant}
        onClose={() => setDetailTenant(undefined)}
        title={detailTenant ? `${detailTenant.firstName} ${detailTenant.lastName}` : ''}
      >
        {detailTenant && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={detailTenant.status} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted">Email</p>
                <p className="text-sm font-medium">{detailTenant.email}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Phone</p>
                <p className="text-sm font-medium">{detailTenant.phone}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Property</p>
                <p className="text-sm font-medium">{getPropertyName(detailTenant.propertyId)}</p>
                <p className="text-xs text-text-muted">Unit {detailTenant.unitNumber}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Monthly Rent</p>
                <p className="text-sm font-medium">${detailTenant.monthlyRent.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
              <div>
                <p className="text-xs text-text-muted">Lease Period</p>
                <p className="text-sm">{new Date(detailTenant.leaseStart).toLocaleDateString()} — {new Date(detailTenant.leaseEnd).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Outstanding Balance</p>
                <p className={`text-sm font-semibold ${detailTenant.balance > 0 ? 'text-red-600' : 'text-accent-600'}`}>
                  ${detailTenant.balance.toLocaleString()}
                </p>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => { setDetailTenant(undefined); setEditing(detailTenant); }}
            >
              Edit Tenant
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

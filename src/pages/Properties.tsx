import { useState } from 'react';
import { Building2, Plus, MapPin, Search, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import PropertyForm from '../components/properties/PropertyForm';
import { useDataStore } from '../store/useDataStore';
import type { Property } from '../types';

export default function Properties() {
  const { properties, addProperty, updateProperty, deleteProperty } = useDataStore();
  const { addToast } = useToast();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | undefined>();
  const [detailProperty, setDetailProperty] = useState<Property | undefined>();

  const filtered = properties.filter((p) => {
    const matchesFilter = filter === 'all' || p.type === filter;
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreate = (data: Omit<Property, 'id' | 'createdAt'>) => {
    addProperty(data);
    setFormOpen(false);
    addToast('success', `Property "${data.name}" created`);
  };

  const handleUpdate = (data: Omit<Property, 'id' | 'createdAt'>) => {
    if (editing) {
      updateProperty(editing.id, data);
      setEditing(undefined);
      addToast('success', `Property "${data.name}" updated`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties in your portfolio`}
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Property</span>
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
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Search properties"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'residential', 'commercial', 'mixed'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((property: Property) => (
          <div key={property.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailProperty(property)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">{property.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{property.address}, {property.city}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={property.status} />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              <div>
                <p className="text-xs text-text-muted">Units</p>
                <p className="text-sm font-semibold">{property.units}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Occupancy</p>
                <p className="text-sm font-semibold">{property.occupancyRate}%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Revenue</p>
                <p className="text-sm font-semibold">${(property.monthlyRevenue / 1000).toFixed(1)}k</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <Building2 className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">No properties match your search</p>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      <Modal
        open={formOpen || !!editing}
        onClose={() => { setFormOpen(false); setEditing(undefined); }}
        title={editing ? 'Edit Property' : 'Add Property'}
        size="lg"
      >
        <PropertyForm
          initial={editing}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailProperty}
        onClose={() => setDetailProperty(undefined)}
        title={detailProperty?.name ?? ''}
        size="lg"
      >
        {detailProperty && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={detailProperty.status} />
              <span className="text-sm text-text-muted capitalize">{detailProperty.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-muted">Address</p>
                <p className="text-sm font-medium">{detailProperty.address}</p>
                <p className="text-sm text-text-secondary">{detailProperty.city}, {detailProperty.state} {detailProperty.zip}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Created</p>
                <p className="text-sm font-medium">{new Date(detailProperty.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 py-3 border-y border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{detailProperty.units}</p>
                <p className="text-xs text-text-muted">Total Units</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">{detailProperty.occupancyRate}%</p>
                <p className="text-xs text-text-muted">Occupancy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary">${detailProperty.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-text-muted">Monthly Revenue</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => { setDetailProperty(undefined); setEditing(detailProperty); }}
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                className="btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50"
                onClick={() => { deleteProperty(detailProperty.id); addToast('info', `Property "${detailProperty.name}" deleted`); setDetailProperty(undefined); }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

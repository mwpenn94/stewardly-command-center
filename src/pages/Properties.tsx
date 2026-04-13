import { useState } from 'react';
import { Building2, Plus, MapPin, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { properties } from '../data/mock';
import type { Property } from '../types';

export default function Properties() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = properties.filter((p) => {
    const matchesFilter = filter === 'all' || p.type === filter;
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle={`${properties.length} properties in your portfolio`}
        action={
          <button className="btn-primary flex items-center gap-2">
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
          <div key={property.id} className="card hover:shadow-md transition-shadow cursor-pointer">
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
    </div>
  );
}

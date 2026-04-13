import { useState } from 'react';
import { Plus, Search, Mail, Phone, Tag } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import DataTable from '../components/ui/DataTable';
import { contacts } from '../data/mock';
import type { Contact } from '../types';

export default function CRM() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      search === '' ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const columns = [
    {
      key: 'name',
      header: 'Contact',
      render: (c: Contact) => (
        <div>
          <p className="font-medium text-text-primary">{c.firstName} {c.lastName}</p>
          {c.company && <p className="text-xs text-text-muted">{c.company}</p>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      hideOnMobile: true,
      render: (c: Contact) => (
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Mail className="w-3 h-3" /> {c.email}
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Phone className="w-3 h-3" /> {c.phone}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (c: Contact) => <StatusBadge status={c.type} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: Contact) => <StatusBadge status={c.status} />,
    },
    {
      key: 'source',
      header: 'Source',
      hideOnMobile: true,
      render: (c: Contact) => <span className="text-sm text-text-secondary">{c.source}</span>,
    },
    {
      key: 'tags',
      header: 'Tags',
      hideOnMobile: true,
      render: (c: Contact) => (
        <div className="flex flex-wrap gap-1">
          {c.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-surface-tertiary text-text-muted">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
          {c.tags.length > 2 && (
            <span className="text-[10px] text-text-muted">+{c.tags.length - 2}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        subtitle="Manage leads, contacts, vendors, and partners"
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contact</span>
            <span className="sm:hidden">Add</span>
          </button>
        }
      />

      {/* Pipeline summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => {
          const count = contacts.filter((c) => c.status === status).length;
          return (
            <div key={status} className="card text-center py-3 px-2">
              <p className="text-lg sm:text-xl font-bold text-text-primary">{count}</p>
              <p className="text-xs text-text-muted capitalize">{status}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Search contacts"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'lead', 'prospect', 'tenant', 'vendor', 'partner'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                typeFilter === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface border border-border text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(c) => c.id}
        emptyMessage="No contacts match your search"
      />
    </div>
  );
}

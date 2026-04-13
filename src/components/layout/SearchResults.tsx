import { useNavigate } from 'react-router-dom';
import { Building2, Users, Wrench, UserCircle, Megaphone } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useDataStore } from '../../store/useDataStore';

interface SearchResult {
  type: 'property' | 'tenant' | 'maintenance' | 'contact' | 'campaign';
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

const typeIcons = {
  property: Building2,
  tenant: Users,
  maintenance: Wrench,
  contact: UserCircle,
  campaign: Megaphone,
};

const typeLabels = {
  property: 'Property',
  tenant: 'Tenant',
  maintenance: 'Maintenance',
  contact: 'Contact',
  campaign: 'Campaign',
};

export default function SearchResults() {
  const { searchQuery, setSearchQuery } = useStore();
  const { properties, tenants, maintenanceRequests, contacts, campaigns } = useDataStore();
  const navigate = useNavigate();

  if (!searchQuery.trim()) return null;

  const q = searchQuery.toLowerCase();
  const results: SearchResult[] = [];

  properties.forEach((p) => {
    if (p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)) {
      results.push({ type: 'property', id: p.id, title: p.name, subtitle: `${p.address}, ${p.city}`, route: '/properties' });
    }
  });

  tenants.forEach((t) => {
    const name = `${t.firstName} ${t.lastName}`;
    if (name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)) {
      results.push({ type: 'tenant', id: t.id, title: name, subtitle: t.email, route: '/tenants' });
    }
  });

  maintenanceRequests.forEach((m) => {
    if (m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
      results.push({ type: 'maintenance', id: m.id, title: m.title, subtitle: m.category, route: '/maintenance' });
    }
  });

  contacts.forEach((c) => {
    const name = `${c.firstName} ${c.lastName}`;
    if (name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company?.toLowerCase().includes(q) ?? false)) {
      results.push({ type: 'contact', id: c.id, title: name, subtitle: c.company ?? c.email, route: '/crm' });
    }
  });

  campaigns.forEach((c) => {
    if (c.name.toLowerCase().includes(q) || c.audience.toLowerCase().includes(q)) {
      results.push({ type: 'campaign', id: c.id, title: c.name, subtitle: c.audience, route: '/marketing' });
    }
  });

  const limited = results.slice(0, 8);

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
      {limited.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-text-muted">
          No results for "{searchQuery}"
        </div>
      ) : (
        <ul className="py-1" role="listbox">
          {limited.map((result) => {
            const Icon = typeIcons[result.type];
            return (
              <li key={`${result.type}-${result.id}`}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-tertiary transition-colors text-left"
                  onClick={() => {
                    setSearchQuery('');
                    navigate(result.route);
                  }}
                  role="option"
                >
                  <div className="p-1.5 rounded-md bg-surface-tertiary flex-shrink-0">
                    <Icon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{result.title}</p>
                    <p className="text-xs text-text-muted truncate">{result.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider flex-shrink-0">
                    {typeLabels[result.type]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {results.length > 8 && (
        <div className="px-4 py-2 border-t border-border text-xs text-text-muted text-center">
          {results.length - 8} more results
        </div>
      )}
    </div>
  );
}

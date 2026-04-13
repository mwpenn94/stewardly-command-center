import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wrench,
  UserCircle,
  Megaphone,
  Database,
  Settings,
  ChevronLeft,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/tenants', icon: Users, label: 'Tenants' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/crm', icon: UserCircle, label: 'CRM' },
  { to: '/marketing', icon: Megaphone, label: 'Marketing' },
  { to: '/pipelines', icon: Database, label: 'Data Pipelines' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } =
    useStore();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-surface border-r border-border
          transition-all duration-300 ease-in-out flex flex-col
          lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-[68px]' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-border ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-text-primary truncate">
                Stewardly
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-surface-tertiary"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse button on desktop */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex p-1 rounded-md hover:bg-surface-tertiary"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-text-muted" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" role="navigation" aria-label="Main navigation">
          <ul className="space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                      }
                      ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600' : ''}`} />
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Expand button when collapsed */}
        {sidebarCollapsed && (
          <div className="hidden lg:flex p-2 border-t border-border justify-center">
            <button
              onClick={toggleSidebarCollapsed}
              className="p-2 rounded-md hover:bg-surface-tertiary"
              aria-label="Expand sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-text-muted rotate-180" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

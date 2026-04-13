import { Menu, Search, Bell } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Header() {
  const { toggleSidebar, searchQuery, setSearchQuery, activeNotifications } = useStore();

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface border-b border-border flex items-center px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-tertiary"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-text-secondary" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="search"
          placeholder="Search properties, tenants, requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9 py-2 text-sm"
          aria-label="Global search"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-surface-tertiary"
          aria-label={`Notifications (${activeNotifications} unread)`}
        >
          <Bell className="w-5 h-5 text-text-secondary" />
          {activeNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeNotifications}
            </span>
          )}
        </button>

        {/* User avatar */}
        <button
          className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold"
          aria-label="User menu"
        >
          SC
        </button>
      </div>
    </header>
  );
}

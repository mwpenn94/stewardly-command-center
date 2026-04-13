import { Menu, Search, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { useStore } from '../../store/useStore';

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeOrder = ['light', 'dark', 'system'] as const;

export default function Header() {
  const { toggleSidebar, searchQuery, setSearchQuery, activeNotifications, theme, setTheme } = useStore();

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(theme);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]);
  };

  const ThemeIcon = themeIcons[theme];

  return (
    <header className="sticky top-0 z-30 h-16 bg-surface border-b border-border flex items-center px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-tertiary min-w-[44px] min-h-[44px] flex items-center justify-center"
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
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 rounded-lg hover:bg-surface-tertiary min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={`Theme: ${theme}. Click to change.`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-surface-tertiary min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={`Notifications (${activeNotifications} unread)`}
        >
          <Bell className="w-5 h-5 text-text-secondary" />
          {activeNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
              {activeNotifications}
            </span>
          )}
        </button>

        {/* User avatar */}
        <button
          className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold min-w-[44px] min-h-[44px]"
          aria-label="User menu"
        >
          SC
        </button>
      </div>
    </header>
  );
}

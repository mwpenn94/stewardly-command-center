import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const effective = getEffectiveTheme(theme);
  document.documentElement.classList.toggle('dark', effective === 'dark');
  localStorage.setItem('stewardly-theme', theme);
}

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeNotifications: number;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const savedTheme = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('stewardly-theme')
  : null) as Theme | null;

export const useStore = create<AppState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  activeNotifications: 3,
  theme: savedTheme ?? 'system',
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));

// Apply theme on initial load
applyTheme(savedTheme ?? 'system');

// Listen for system preference changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = useStore.getState().theme;
    if (current === 'system') applyTheme('system');
  });
}

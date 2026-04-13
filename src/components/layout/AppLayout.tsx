import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6" role="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

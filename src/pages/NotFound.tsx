import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-6xl sm:text-8xl font-bold text-primary-200">404</p>
      <h1 className="text-xl sm:text-2xl font-semibold text-text-primary mt-4">Page not found</h1>
      <p className="text-text-secondary mt-2 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 mt-6">
        <Link to="/" className="btn-primary flex items-center gap-2">
          <Home className="w-4 h-4" /> Dashboard
        </Link>
        <button onClick={() => window.history.back()} className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    </div>
  );
}

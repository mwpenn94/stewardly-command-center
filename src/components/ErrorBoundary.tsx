import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="p-4 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
          <p className="text-text-secondary mt-2 max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {this.state.error && (
            <pre className="mt-4 text-xs text-text-muted bg-surface-tertiary rounded-lg p-3 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-6"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

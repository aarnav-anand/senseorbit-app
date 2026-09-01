import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-8 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl font-bold">
            ⚠️
          </div>
          <h3 className="text-xl font-bold text-red-900">Application Error</h3>
          <p className="text-sm text-red-700">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please refresh or return to the dashboard.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-800"
          >
            🏠 Return to Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex p-4 rounded-2xl bg-red-500/20 border border-red-500/40">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Došlo k chybě</h1>
            <p className="text-white/60 text-sm">{this.state.error.message}</p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Zkusit znovu
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

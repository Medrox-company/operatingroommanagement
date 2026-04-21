import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

const MAX_AUTO_RETRIES = 3;
const AUTO_RETRY_DELAY_MS = 2000;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { 
    hasError: false, 
    error: null,
    errorInfo: null,
    retryCount: 0,
    isRecovering: false
  };
  
  private retryTimeoutId: number | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[v0] ErrorBoundary caught:', error.message);
    console.error('[v0] Component stack:', errorInfo.componentStack);
    
    this.setState({ errorInfo });
    
    // Call optional error handler prop
    this.props.onError?.(error, errorInfo);
    
    // Auto-retry for transient errors (network, race conditions)
    const isTransientError = this.isTransientError(error);
    if (isTransientError && this.state.retryCount < MAX_AUTO_RETRIES) {
      this.scheduleAutoRetry();
    }
  }

  componentWillUnmount() {
    // Cleanup timeout on unmount
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isTransientError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('undefined is not an object') ||
      message.includes('cannot read property') ||
      message.includes('null')
    );
  }

  private scheduleAutoRetry() {
    this.setState({ isRecovering: true });
    
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState(prev => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prev.retryCount + 1,
        isRecovering: false
      }));
    }, AUTO_RETRY_DELAY_MS);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const isNetworkError = this.state.error.message.toLowerCase().includes('network') ||
                             this.state.error.message.toLowerCase().includes('fetch');
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a12] to-[#1a1a2e] text-white p-8">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className={`inline-flex p-4 rounded-2xl border ${
              isNetworkError 
                ? 'bg-amber-500/20 border-amber-500/40' 
                : 'bg-red-500/20 border-red-500/40'
            }`}>
              {isNetworkError ? (
                <WifiOff className="w-12 h-12 text-amber-400" />
              ) : (
                <AlertTriangle className="w-12 h-12 text-red-400" />
              )}
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold uppercase tracking-tight">
              {isNetworkError ? 'Problém s připojením' : 'Došlo k chybě'}
            </h1>
            
            {/* Error Message */}
            <p className="text-white/60 text-sm">
              {isNetworkError 
                ? 'Zkontrolujte své internetové připojení a zkuste to znovu.'
                : this.state.error.message}
            </p>
            
            {/* Auto-retry indicator */}
            {this.state.isRecovering && (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Automatické obnovení... ({this.state.retryCount + 1}/{MAX_AUTO_RETRIES})</span>
              </div>
            )}
            
            {/* Retry count */}
            {this.state.retryCount >= MAX_AUTO_RETRIES && (
              <p className="text-white/40 text-xs">
                Automatické obnovení selhalo. Zkuste ruční obnovení.
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                disabled={this.state.isRecovering}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${this.state.isRecovering ? 'animate-spin' : ''}`} />
                Zkusit znovu
              </button>
              
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-all"
              >
                <Home className="w-4 h-4" />
                Obnovit stránku
              </button>
            </div>
            
            {/* Technical details (collapsible) */}
            <details className="mt-6 text-left">
              <summary className="text-white/30 text-xs cursor-pointer hover:text-white/50 transition-colors">
                Technické detaily
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-black/50 text-[10px] text-white/40 overflow-x-auto max-h-32 overflow-y-auto">
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

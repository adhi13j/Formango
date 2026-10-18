import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError } from '@/lib/logError';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown instead of the default fallback, for example inside a panel. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('ErrorBoundary caught an error', { error, componentStack: info.componentStack });
  }

  override render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? <ErrorFallback />;
    return this.props.children;
  }
}

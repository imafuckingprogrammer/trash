'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Global Error Boundary
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log to monitoring service (replace with your monitoring service)
    console.error('Global error caught:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 text-sm overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component-specific Error Boundary
interface ComponentErrorBoundaryProps extends Props {
  componentName?: string;
}

export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, State> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    console.error(`Error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-medium text-destructive">
              {this.props.componentName || 'Component'} Error
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            This component encountered an error and couldn't render properly.
          </p>
          <Button onClick={this.handleRetry} size="sm" variant="outline">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network Error Component
export function NetworkErrorComponent({ 
  onRetry, 
  error 
}: { 
  onRetry?: () => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        {error || "Unable to connect to the server. Please check your internet connection and try again."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// 404 Error Component
export function NotFoundComponent({ 
  title = "Page Not Found",
  description = "The page you're looking for doesn't exist.",
  showHomeButton = true
}: {
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {showHomeButton && (
        <Button onClick={() => window.location.href = '/'}>
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
      )}
    </div>
  );
}

// Unauthorized Error Component
export function UnauthorizedComponent({
  onLogin
}: {
  onLogin?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        You need to be logged in to access this content.
      </p>
      <div className="flex gap-2">
        {onLogin && (
          <Button onClick={onLogin}>
            Login
          </Button>
        )}
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}

// Generic Error Component
export function ErrorComponent({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  showHomeButton = false
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      <div className="flex gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {showHomeButton && (
          <Button onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  );
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  return (error: Error) => {
    console.error('Async error:', error);
    // You can integrate with error reporting service here
    throw error; // Re-throw to be caught by error boundary
  };
} 
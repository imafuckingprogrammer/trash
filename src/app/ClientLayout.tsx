"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { OptimizedAuthProvider } from '@/contexts/OptimizedAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { GlobalErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Performance monitoring wrapper
function PerformanceWrapper({ children }: { children: React.ReactNode }) {
  usePerformanceMonitor();
  return <>{children}</>;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <ThemeProvider>
          <OptimizedAuthProvider>
            <PerformanceWrapper>
              {children}
              <Toaster />
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </PerformanceWrapper>
          </OptimizedAuthProvider>
        </ThemeProvider>
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
} 
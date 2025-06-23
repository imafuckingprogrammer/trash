import React, { Suspense, lazy } from 'react';
import { 
  PageSkeleton, 
  BookCardSkeleton, 
  ReviewCardSkeleton, 
  ListCardSkeleton,
  CurrentlyReadingPanelSkeleton,
  FeedSkeleton 
} from './loading';
import { ComponentErrorBoundary } from './error-boundary';

// Lazy load page components
export const LazyFeedPage = lazy(() => import('@/app/feed/page'));
export const LazyDiscoverPage = lazy(() => import('@/app/discover/page'));
export const LazyBookDetailsPage = lazy(() => import('@/app/books/[id]/page'));
export const LazyProfilePage = lazy(() => import('@/app/profile/[username]/page'));
export const LazyListsPage = lazy(() => import('@/app/lists/page'));
export const LazyListDetailsPage = lazy(() => import('@/app/lists/[id]/page'));
export const LazyNewListPage = lazy(() => import('@/app/lists/new/page'));
export const LazySearchUsersPage = lazy(() => import('@/app/search/users/page'));
export const LazySearchListsPage = lazy(() => import('@/app/search/lists/page'));
export const LazyNotificationsPage = lazy(() => import('@/app/notifications/page'));
export const LazyAnalyticsPage = lazy(() => import('@/app/analytics/page'));
export const LazySettingsPage = lazy(() => import('@/app/settings/page'));

// Lazy load component chunks
export const LazyCurrentlyReadingPanel = lazy(() => 
  import('@/components/books/CurrentlyReadingPanel').then(module => ({
    default: module.CurrentlyReadingPanel
  }))
);

export const LazyLogBookDialog = lazy(() => 
  import('@/components/books/LogBookDialog').then(module => ({
    default: module.LogBookDialog
  }))
);

export const LazyPersonalizedRecommendationsForm = lazy(() => 
  import('@/components/recommendations/PersonalizedRecommendationsForm').then(module => ({
    default: module.PersonalizedRecommendationsForm
  }))
);

// Higher-order component for lazy loading with error boundaries and suspense
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  componentName?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <PageSkeleton />,
  errorFallback,
  componentName = 'Component'
}) => (
  <ComponentErrorBoundary 
    componentName={componentName}
    fallback={errorFallback}
  >
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </ComponentErrorBoundary>
);

// Specific wrappers for different component types
export const LazyPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazyWrapper 
    fallback={<PageSkeleton />}
    componentName="Page"
  >
    {children}
  </LazyWrapper>
);

export const LazyFeedWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazyWrapper 
    fallback={<FeedSkeleton />}
    componentName="Feed"
  >
    {children}
  </LazyWrapper>
);

export const LazyBookCardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazyWrapper 
    fallback={<BookCardSkeleton />}
    componentName="BookCard"
  >
    {children}
  </LazyWrapper>
);

export const LazyReviewWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazyWrapper 
    fallback={<ReviewCardSkeleton />}
    componentName="Review"
  >
    {children}
  </LazyWrapper>
);

export const LazyListWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazyWrapper 
    fallback={<ListCardSkeleton />}
    componentName="List"
  >
    {children}
  </LazyWrapper>
);

export const LazyCurrentlyReadingWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LazyWrapper 
    fallback={<CurrentlyReadingPanelSkeleton />}
    componentName="CurrentlyReading"
  >
    {children}
  </LazyWrapper>
);

// Dynamic import helper with retry logic
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return dynamicImport(importFn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Preload components for better UX
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Only preload in browser
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        importFn().catch(() => {
          // Silently fail preloading
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          // Silently fail preloading
        });
      }, 100);
    }
  }
};

// Preload critical components on app start
export const preloadCriticalComponents = () => {
  preloadComponent(() => import('@/components/books/CurrentlyReadingPanel'));
  preloadComponent(() => import('@/components/books/LogBookDialog'));
  preloadComponent(() => import('@/app/feed/page'));
  preloadComponent(() => import('@/app/discover/page'));
};

// Hook for lazy component loading with loading state
export const useLazyComponent = <T,>(
  importFn: () => Promise<{ default: T }>,
  deps: React.DependencyList = []
) => {
  const [component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    dynamicImport(importFn)
      .then((module) => {
        if (mounted) {
          setComponent(module.default);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, deps);

  return { component, loading, error };
}; 
import { useEffect, useCallback, useRef } from 'react';

// Performance metrics interface
interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  componentRenderTime?: number;
  memoryUsage?: number;
}

// Performance observer types
type PerformanceObserverCallback = (metrics: PerformanceMetrics) => void;

// Custom hook for performance monitoring
export const usePerformanceMonitor = (
  callback?: PerformanceObserverCallback,
  componentName?: string
) => {
  const startTimeRef = useRef<number>(performance.now());
  const metricsRef = useRef<PerformanceMetrics>({});

  // Report metrics to callback or console
  const reportMetrics = useCallback((metrics: PerformanceMetrics) => {
    if (callback) {
      callback(metrics);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`Performance metrics${componentName ? ` for ${componentName}` : ''}:`, metrics);
    }
  }, [callback, componentName]);

  // Measure component render time
  const measureRenderTime = useCallback(() => {
    const renderTime = performance.now() - startTimeRef.current;
    metricsRef.current.componentRenderTime = renderTime;
    
    if (renderTime > 16) { // Warn if render takes longer than one frame
      console.warn(`Slow render detected${componentName ? ` in ${componentName}` : ''}: ${renderTime.toFixed(2)}ms`);
    }
    
    return renderTime;
  }, [componentName]);

  // Get memory usage (if available)
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }, []);

  // Observe Core Web Vitals
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const observers: PerformanceObserver[] = [];

    try {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            metricsRef.current.lcp = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observers.push(lcpObserver);

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-input') {
              metricsRef.current.fid = entry.processingStart - entry.startTime;
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        observers.push(fidObserver);

        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          metricsRef.current.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.push(clsObserver);

        // Navigation timing for TTFB and FCP
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.entryType === 'navigation') {
              metricsRef.current.ttfb = entry.responseStart - entry.requestStart;
            }
            if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
              metricsRef.current.fcp = entry.startTime;
            }
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation', 'paint'] });
        observers.push(navigationObserver);
      }

      // Report metrics after a delay to collect all data
      const reportTimer = setTimeout(() => {
        const memoryInfo = getMemoryUsage();
        if (memoryInfo) {
          metricsRef.current.memoryUsage = memoryInfo.used;
        }
        reportMetrics(metricsRef.current);
      }, 5000);

      return () => {
        clearTimeout(reportTimer);
        observers.forEach(observer => observer.disconnect());
      };
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
    }
  }, [reportMetrics, getMemoryUsage]);

  // Component unmount effect to measure final render time
  useEffect(() => {
    return () => {
      measureRenderTime();
    };
  }, [measureRenderTime]);

  return {
    measureRenderTime,
    getMemoryUsage,
    reportMetrics: () => reportMetrics(metricsRef.current),
    metrics: metricsRef.current,
  };
};

// Hook for measuring specific operations
export const useOperationTimer = (operationName: string) => {
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback(() => {
    const duration = performance.now() - startTime.current;
    if (process.env.NODE_ENV === 'development') {
      console.log(`${operationName} took ${duration.toFixed(2)}ms`);
    }
    return duration;
  }, [operationName]);

  return { start, end };
};

// Hook for monitoring component re-renders
export const useRenderMonitor = (componentName: string, props?: any) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderCount.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
      
      if (props && prevProps.current) {
        const changedProps = Object.keys(props).filter(
          key => props[key] !== prevProps.current[key]
        );
        
        if (changedProps.length > 0) {
          console.log(`${componentName} re-rendered due to props:`, changedProps);
        }
      }
      
      prevProps.current = props;
    }
  });

  return renderCount.current;
};

// Hook for measuring API response times
export const useApiTimer = () => {
  const timers = useRef<Map<string, number>>(new Map());

  const startTimer = useCallback((requestId: string) => {
    timers.current.set(requestId, performance.now());
  }, []);

  const endTimer = useCallback((requestId: string) => {
    const startTime = timers.current.get(requestId);
    if (startTime) {
      const duration = performance.now() - startTime;
      timers.current.delete(requestId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`API request ${requestId} took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }, []);

  return { startTimer, endTimer };
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals thresholds (in milliseconds)
  LCP_GOOD: 2500,
  LCP_NEEDS_IMPROVEMENT: 4000,
  FID_GOOD: 100,
  FID_NEEDS_IMPROVEMENT: 300,
  CLS_GOOD: 0.1,
  CLS_NEEDS_IMPROVEMENT: 0.25,
  
  // Custom thresholds
  COMPONENT_RENDER_WARNING: 16, // One frame at 60fps
  COMPONENT_RENDER_ERROR: 100,
  API_RESPONSE_WARNING: 1000,
  API_RESPONSE_ERROR: 5000,
};

// Utility to check if metrics meet performance standards
export const checkPerformanceThresholds = (metrics: PerformanceMetrics) => {
  const issues: string[] = [];

  if (metrics.lcp && metrics.lcp > PERFORMANCE_THRESHOLDS.LCP_NEEDS_IMPROVEMENT) {
    issues.push(`LCP is poor: ${metrics.lcp}ms`);
  }

  if (metrics.fid && metrics.fid > PERFORMANCE_THRESHOLDS.FID_NEEDS_IMPROVEMENT) {
    issues.push(`FID is poor: ${metrics.fid}ms`);
  }

  if (metrics.cls && metrics.cls > PERFORMANCE_THRESHOLDS.CLS_NEEDS_IMPROVEMENT) {
    issues.push(`CLS is poor: ${metrics.cls}`);
  }

  if (metrics.componentRenderTime && metrics.componentRenderTime > PERFORMANCE_THRESHOLDS.COMPONENT_RENDER_ERROR) {
    issues.push(`Component render time is poor: ${metrics.componentRenderTime}ms`);
  }

  return {
    isGood: issues.length === 0,
    issues,
  };
}; 
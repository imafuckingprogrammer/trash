// Advanced caching utilities for LibroVision

// Browser storage interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number;
  version?: string;
}

// Cache configuration
interface CacheConfig {
  maxAge?: number; // milliseconds
  version?: string;
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  version: '1.0.0',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

// Local Storage Cache
export class LocalStorageCache {
  private prefix: string;
  private config: Required<CacheConfig>;

  constructor(prefix: string = 'librovision_', config: CacheConfig = {}) {
    this.prefix = prefix;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(item: CacheItem<any>): boolean {
    if (!item.expiry) return false;
    return Date.now() > item.timestamp + item.expiry;
  }

  private isVersionMismatch(item: CacheItem<any>): boolean {
    return item.version !== this.config.version;
  }

  set<T>(key: string, data: T, maxAge?: number): boolean {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: maxAge || this.config.maxAge,
        version: this.config.version,
      };

      const serialized = this.config.serialize(item);
      localStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      console.warn('Failed to set localStorage cache:', error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    try {
      const serialized = localStorage.getItem(this.getKey(key));
      if (!serialized) return null;

      const item: CacheItem<T> = this.config.deserialize(serialized);
      
      if (this.isExpired(item) || this.isVersionMismatch(item)) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error);
      this.delete(key);
      return null;
    }
  }

  delete(key: string): boolean {
    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.warn('Failed to delete localStorage cache:', error);
      return false;
    }
  }

  clear(): boolean {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
      return false;
    }
  }

  size(): number {
    try {
      return Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      ).length;
    } catch (error) {
      return 0;
    }
  }
}

// Session Storage Cache
export class SessionStorageCache {
  private prefix: string;
  private config: Required<CacheConfig>;

  constructor(prefix: string = 'librovision_', config: CacheConfig = {}) {
    this.prefix = prefix;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(item: CacheItem<any>): boolean {
    if (!item.expiry) return false;
    return Date.now() > item.timestamp + item.expiry;
  }

  private isVersionMismatch(item: CacheItem<any>): boolean {
    return item.version !== this.config.version;
  }

  set<T>(key: string, data: T, maxAge?: number): boolean {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: maxAge || this.config.maxAge,
        version: this.config.version,
      };

      const serialized = this.config.serialize(item);
      sessionStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      console.warn('Failed to set sessionStorage cache:', error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    try {
      const serialized = sessionStorage.getItem(this.getKey(key));
      if (!serialized) return null;

      const item: CacheItem<T> = this.config.deserialize(serialized);
      
      if (this.isExpired(item) || this.isVersionMismatch(item)) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get sessionStorage cache:', error);
      this.delete(key);
      return null;
    }
  }

  delete(key: string): boolean {
    try {
      sessionStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.warn('Failed to delete sessionStorage cache:', error);
      return false;
    }
  }

  clear(): boolean {
    try {
      const keys = Object.keys(sessionStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      keys.forEach(key => sessionStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Failed to clear sessionStorage cache:', error);
      return false;
    }
  }

  size(): number {
    try {
      return Object.keys(sessionStorage).filter(key => 
        key.startsWith(this.prefix)
      ).length;
    } catch (error) {
      return 0;
    }
  }
}

// In-Memory Cache with LRU eviction
export class MemoryCache<T> {
  private cache: Map<string, CacheItem<T>>;
  private accessOrder: string[];
  private maxSize: number;
  private config: Required<CacheConfig>;

  constructor(maxSize: number = 100, config: CacheConfig = {}) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }

  private isExpired(item: CacheItem<T>): boolean {
    if (!item.expiry) return false;
    return Date.now() > item.timestamp + item.expiry;
  }

  set(key: string, data: T, maxAge?: number): void {
    this.evictLRU();

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: maxAge || this.config.maxAge,
      version: this.config.version,
    };

    this.cache.set(key, item);
    this.updateAccessOrder(key);
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (this.isExpired(item)) {
      this.delete(key);
      return null;
    }

    this.updateAccessOrder(key);
    return item.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Multi-tier cache that tries memory -> localStorage -> sessionStorage
export class MultiTierCache<T> {
  private memoryCache: MemoryCache<T>;
  private localStorageCache: LocalStorageCache;
  private sessionStorageCache: SessionStorageCache;

  constructor(
    memoryMaxSize: number = 50,
    cachePrefix: string = 'librovision_',
    config: CacheConfig = {}
  ) {
    this.memoryCache = new MemoryCache<T>(memoryMaxSize, config);
    this.localStorageCache = new LocalStorageCache(cachePrefix, config);
    this.sessionStorageCache = new SessionStorageCache(cachePrefix, config);
  }

  set(key: string, data: T, maxAge?: number, persistent?: boolean): boolean {
    try {
      // Always set in memory cache
      this.memoryCache.set(key, data, maxAge);

      // Set in persistent storage if requested
      if (persistent) {
        return this.localStorageCache.set(key, data, maxAge);
      } else {
        return this.sessionStorageCache.set(key, data, maxAge);
      }
    } catch (error) {
      console.warn('Failed to set multi-tier cache:', error);
      return false;
    }
  }

  get(key: string): T | null {
    // Try memory cache first
    let data = this.memoryCache.get(key);
    if (data !== null) return data;

    // Try localStorage
    data = this.localStorageCache.get<T>(key);
    if (data !== null) {
      // Populate memory cache
      this.memoryCache.set(key, data);
      return data;
    }

    // Try sessionStorage
    data = this.sessionStorageCache.get<T>(key);
    if (data !== null) {
      // Populate memory cache
      this.memoryCache.set(key, data);
      return data;
    }

    return null;
  }

  delete(key: string): boolean {
    const memoryDeleted = this.memoryCache.delete(key);
    const localDeleted = this.localStorageCache.delete(key);
    const sessionDeleted = this.sessionStorageCache.delete(key);
    
    return memoryDeleted || localDeleted || sessionDeleted;
  }

  clear(): boolean {
    this.memoryCache.clear();
    const localCleared = this.localStorageCache.clear();
    const sessionCleared = this.sessionStorageCache.clear();
    
    return localCleared && sessionCleared;
  }

  size(): number {
    return this.memoryCache.size();
  }
}

// Cache instances for different data types
export const bookCache = new MultiTierCache(100, 'librovision_books_');
export const userCache = new MultiTierCache(50, 'librovision_users_');
export const reviewCache = new MultiTierCache(200, 'librovision_reviews_');
export const listCache = new MultiTierCache(50, 'librovision_lists_');

// Utility functions for cache management
export const cacheUtils = {
  // Clear all caches
  clearAll: () => {
    bookCache.clear();
    userCache.clear();
    reviewCache.clear();
    listCache.clear();
  },

  // Get cache statistics
  getStats: () => ({
    books: bookCache.size(),
    users: userCache.size(),
    reviews: reviewCache.size(),
    lists: listCache.size(),
  }),

  // Preload critical data
  preloadCriticalData: async (userId?: string) => {
    if (!userId) return;

    try {
      // This would be called with actual API functions
      // Example: preload user's currently reading books
      console.log('Preloading critical data for user:', userId);
    } catch (error) {
      console.warn('Failed to preload critical data:', error);
    }
  },

  // Cache warming strategy
  warmCache: async () => {
    try {
      // Preload popular books, trending reviews, etc.
      console.log('Warming cache with popular content');
    } catch (error) {
      console.warn('Failed to warm cache:', error);
    }
  },
};

// Cache invalidation patterns
export const invalidationPatterns = {
  // Invalidate user-related caches when user data changes
  invalidateUserData: (userId: string) => {
    userCache.delete(`user_${userId}`);
    userCache.delete(`user_profile_${userId}`);
    userCache.delete(`user_books_${userId}`);
  },

  // Invalidate book-related caches when book data changes
  invalidateBookData: (bookId: string) => {
    bookCache.delete(`book_${bookId}`);
    bookCache.delete(`book_reviews_${bookId}`);
    bookCache.delete(`book_details_${bookId}`);
  },

  // Invalidate review-related caches
  invalidateReviewData: (reviewId: string, bookId?: string) => {
    reviewCache.delete(`review_${reviewId}`);
    if (bookId) {
      bookCache.delete(`book_reviews_${bookId}`);
    }
  },

  // Invalidate list-related caches
  invalidateListData: (listId: string, userId?: string) => {
    listCache.delete(`list_${listId}`);
    if (userId) {
      userCache.delete(`user_lists_${userId}`);
    }
  },
}; 
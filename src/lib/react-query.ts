import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// Query key factories for consistent cache management
export const queryKeys = {
  // Books
  books: ['books'] as const,
  book: (id: string) => [...queryKeys.books, id] as const,
  bookSearch: (query: string, filters?: any) => [...queryKeys.books, 'search', query, filters] as const,
  popularBooks: () => [...queryKeys.books, 'popular'] as const,
  topBooksThisWeek: () => [...queryKeys.books, 'top-week'] as const,
  
  // Users
  users: ['users'] as const,
  user: (id: string) => [...queryKeys.users, id] as const,
  userProfile: (username: string) => [...queryKeys.users, 'profile', username] as const,
  userBooks: (userId: string) => [...queryKeys.users, userId, 'books'] as const,
  
  // Reviews
  reviews: ['reviews'] as const,
  review: (id: string) => [...queryKeys.reviews, id] as const,
  bookReviews: (bookId: string) => [...queryKeys.reviews, 'book', bookId] as const,
  userReviews: (userId: string) => [...queryKeys.reviews, 'user', userId] as const,
  
  // Lists
  lists: ['lists'] as const,
  list: (id: string) => [...queryKeys.lists, id] as const,
  userLists: (userId: string) => [...queryKeys.lists, 'user', userId] as const,
  
  // Social
  feed: ['feed'] as const,
  userFeed: (userId: string) => [...queryKeys.feed, userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  follows: (userId: string) => ['follows', userId] as const,
  
  // Comments
  comments: ['comments'] as const,
  reviewComments: (reviewId: string) => [...queryKeys.comments, 'review', reviewId] as const,
  listComments: (listId: string) => [...queryKeys.comments, 'list', listId] as const,
};

// Default query options
const queryConfig: DefaultOptions = {
  queries: {
    // 5 minutes stale time for most data
    staleTime: 5 * 60 * 1000,
    // 10 minutes cache time
    gcTime: 10 * 60 * 1000,
    // Don't refetch on window focus for better UX
    refetchOnWindowFocus: false,
    // Retry failed requests 3 times with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutations: {
    // Retry mutations once
    retry: 1,
    // Global error handling for mutations
    onError: (error: any) => {
      console.error('Mutation error:', error);
      // You can add toast notifications here
    },
  },
};

// Create query client with optimized configuration
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// Request deduplication cache
const requestCache = new Map<string, Promise<any>>();

export function createDedupedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const cached = requestCache.get(key);
  if (cached) {
    return cached;
  }
  
  const promise = requestFn().finally(() => {
    requestCache.delete(key);
  });
  
  requestCache.set(key, promise);
  return promise;
}

// Helper function to invalidate related queries
export function invalidateBookQueries(bookId?: string) {
  if (bookId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.book(bookId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookReviews(bookId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.books });
  queryClient.invalidateQueries({ queryKey: queryKeys.popularBooks() });
  queryClient.invalidateQueries({ queryKey: queryKeys.topBooksThisWeek() });
}

export function invalidateUserQueries(userId?: string) {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userBooks(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userReviews(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userLists(userId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.users });
}

export function invalidateReviewQueries(reviewId?: string, bookId?: string) {
  if (reviewId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.review(reviewId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.reviewComments(reviewId) });
  }
  if (bookId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookReviews(bookId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
  queryClient.invalidateQueries({ queryKey: queryKeys.feed });
} 
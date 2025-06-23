import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys, queryClient, createDedupedRequest, invalidateBookQueries } from '@/lib/react-query';
import * as bookService from '@/lib/services/bookService';
import type { Book, PaginatedResponse, UserBookInteraction } from '@/types';
import { useAuth } from '@/contexts/OptimizedAuthContext';

// Book search with infinite scroll
export function useBookSearch(
  query: string, 
  filters?: Record<string, any>,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: queryKeys.bookSearch(query, filters),
    queryFn: ({ pageParam = 1 }) => 
      createDedupedRequest(
        `book-search-${query}-${JSON.stringify(filters)}-${pageParam}`,
        () => bookService.searchBooks(query, pageParam, 20, filters)
      ),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!query && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes for search results
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
  });
}

// Single book details
export function useBook(bookId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.book(bookId),
    queryFn: () => 
      createDedupedRequest(
        `book-${bookId}`,
        () => bookService.getBookDetails(bookId)
      ),
    enabled: !!bookId && (options?.enabled !== false),
    staleTime: 30 * 60 * 1000, // 30 minutes for book details
  });
}

// Popular books
export function usePopularBooks(limit: number = 5) {
  return useQuery({
    queryKey: queryKeys.popularBooks(),
    queryFn: () => 
      createDedupedRequest(
        'popular-books',
        () => bookService.getPopularBooks(limit)
      ),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

// Top books this week
export function useTopBooksThisWeek(limit: number = 4) {
  return useQuery({
    queryKey: queryKeys.topBooksThisWeek(),
    queryFn: () => 
      createDedupedRequest(
        'top-books-week',
        () => bookService.getRecentlyReviewedBooks(limit)
      ),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache
  });
}

// Currently reading books
export function useCurrentlyReadingBooks(limit: number = 6) {
  const { authUser } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.userBooks(authUser?.id || ''),
    queryFn: () => 
      createDedupedRequest(
        `currently-reading-${authUser?.id}`,
        () => bookService.getCurrentlyReadingBooks(limit)
      ),
    enabled: !!authUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// User book interaction
export function useUserBookInteraction(bookId: string) {
  const { authUser } = useAuth();
  
  return useQuery({
    queryKey: [...queryKeys.book(bookId), 'interaction'],
    queryFn: () => 
      createDedupedRequest(
        `book-interaction-${bookId}-${authUser?.id}`,
        () => bookService.getUserBookInteraction(bookId)
      ),
    enabled: !!authUser?.id && !!bookId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutations with optimistic updates
export function useUpdateBookInteraction() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: ({ bookId, interaction }: { 
      bookId: string; 
      interaction: Partial<UserBookInteraction> 
    }) => bookService.updateUserBookInteraction(bookId, interaction),
    
    onMutate: async ({ bookId, interaction }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      // Snapshot previous value
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      // Optimistically update the book
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserRating: interaction.rating ?? previousBook.currentUserRating,
          currentUserIsRead: interaction.is_read ?? previousBook.currentUserIsRead,
          currentUserIsCurrentlyReading: interaction.is_currently_reading ?? previousBook.currentUserIsCurrentlyReading,
          currentUserIsOnWatchlist: interaction.is_on_watchlist ?? previousBook.currentUserIsOnWatchlist,
          currentUserIsLiked: interaction.is_liked ?? previousBook.currentUserIsLiked,
          currentUserIsOwned: interaction.is_owned ?? previousBook.currentUserIsOwned,
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, { bookId }, context) => {
      // Revert optimistic update
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, { bookId }) => {
      // Invalidate related queries
      invalidateBookQueries(bookId);
      if (authUser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userBooks(authUser.id) });
      }
    },
  });
}

// Like book mutation
export function useLikeBook() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: bookService.likeBook,
    
    onMutate: async (bookId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserIsLiked: true,
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, bookId, context) => {
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, bookId) => {
      invalidateBookQueries(bookId);
    },
  });
}

// Unlike book mutation
export function useUnlikeBook() {
  return useMutation({
    mutationFn: bookService.unlikeBook,
    
    onMutate: async (bookId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserIsLiked: false,
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, bookId, context) => {
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, bookId) => {
      invalidateBookQueries(bookId);
    },
  });
}

// Currently reading mutations
export function useMarkAsCurrentlyReading() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: bookService.markAsCurrentlyReading,
    
    onMutate: async (bookId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserIsCurrentlyReading: true,
          currentUserIsRead: false, // Mutual exclusivity
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, bookId, context) => {
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, bookId) => {
      invalidateBookQueries(bookId);
      if (authUser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userBooks(authUser.id) });
      }
    },
  });
}

export function useRemoveFromCurrentlyReading() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: bookService.removeFromCurrentlyReading,
    
    onMutate: async (bookId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserIsCurrentlyReading: false,
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, bookId, context) => {
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, bookId) => {
      invalidateBookQueries(bookId);
      if (authUser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userBooks(authUser.id) });
      }
    },
  });
}

// Watchlist mutations
export function useAddToWatchlist() {
  return useMutation({
    mutationFn: bookService.addToWatchlist,
    
    onMutate: async (bookId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserIsOnWatchlist: true,
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, bookId, context) => {
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, bookId) => {
      invalidateBookQueries(bookId);
    },
  });
}

export function useRemoveFromWatchlist() {
  return useMutation({
    mutationFn: bookService.removeFromWatchlist,
    
    onMutate: async (bookId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.book(bookId) });
      
      const previousBook = queryClient.getQueryData<Book>(queryKeys.book(bookId));
      
      if (previousBook) {
        queryClient.setQueryData<Book>(queryKeys.book(bookId), {
          ...previousBook,
          currentUserIsOnWatchlist: false,
        });
      }
      
      return { previousBook };
    },
    
    onError: (err, bookId, context) => {
      if (context?.previousBook) {
        queryClient.setQueryData(queryKeys.book(bookId), context.previousBook);
      }
    },
    
    onSettled: (data, error, bookId) => {
      invalidateBookQueries(bookId);
    },
  });
} 
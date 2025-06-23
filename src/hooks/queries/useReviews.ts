import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, queryKeys, invalidateReviewQueries } from '@/lib/react-query';
import * as reviewService from '@/lib/services/reviewService';
import * as bookService from '@/lib/services/bookService';
import type { Review, PaginatedResponse } from '@/types';
import { useAuth } from '@/contexts/OptimizedAuthContext';

// Book reviews with infinite scroll
export function useBookReviews(
  bookId: string,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: queryKeys.bookReviews(bookId),
    queryFn: ({ pageParam = 1 }) => bookService.getBookReviews(bookId, pageParam, 10),
    getNextPageParam: (lastPage: PaginatedResponse<Review>) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!bookId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Single review query
export function useReview(reviewId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.review(reviewId),
    queryFn: () => reviewService.getReviewDetails(reviewId),
    enabled: !!reviewId && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Top reviews this week
export function useTopReviewsThisWeek(limit: number = 5) {
  return useQuery({
    queryKey: [...queryKeys.reviews, 'top-week', limit],
    queryFn: () => reviewService.getTopReviewsThisWeek(limit),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Add review mutation
export function useAddReview() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: ({ bookId, rating, reviewText }: {
      bookId: string;
      rating: number;
      reviewText?: string;
    }) => bookService.addBookReview(bookId, rating, reviewText),
    
    onMutate: async ({ bookId, rating, reviewText }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.bookReviews(bookId) });
      
      // Optimistically add the review to the list
      const previousReviews = queryClient.getQueryData(queryKeys.bookReviews(bookId));
      
      if (previousReviews && authUser) {
        const optimisticReview: Review = {
          id: 'temp-' + Date.now(),
          book_id: bookId,
          user_id: authUser.id,
          rating,
          review_text: reviewText || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          like_count: 0,
          comment_count: 0,
          current_user_has_liked: false,
          user: {
            id: authUser.id,
            username: 'You',
            name: 'You',
            avatar_url: undefined,
            bio: undefined,
            created_at: new Date().toISOString(),
          },
        };
        
        // Add to the beginning of the first page
        queryClient.setQueryData(queryKeys.bookReviews(bookId), (old: any) => {
          if (!old?.pages?.[0]) return old;
          
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                items: [optimisticReview, ...old.pages[0].items],
                total: old.pages[0].total + 1,
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }
      
      return { previousReviews };
    },
    
    onError: (err, { bookId }, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(queryKeys.bookReviews(bookId), context.previousReviews);
      }
    },
    
    onSettled: (data, error, { bookId }) => {
      // Invalidate related queries
      invalidateReviewQueries(data?.id, bookId);
      if (authUser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userReviews(authUser.id) });
      }
    },
  });
}

// Update review mutation
export function useUpdateReview() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: ({ reviewId, rating, reviewText }: {
      reviewId: string;
      rating: number;
      reviewText?: string;
    }) => reviewService.updateReview(reviewId, rating, reviewText),
    
    onMutate: async ({ reviewId, rating, reviewText }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.review(reviewId) });
      
      const previousReview = queryClient.getQueryData<Review>(queryKeys.review(reviewId));
      
      if (previousReview) {
        queryClient.setQueryData<Review>(queryKeys.review(reviewId), {
          ...previousReview,
          rating,
          review_text: reviewText || '',
          updated_at: new Date().toISOString(),
        });
      }
      
      return { previousReview };
    },
    
    onError: (err, { reviewId }, context) => {
      if (context?.previousReview) {
        queryClient.setQueryData(queryKeys.review(reviewId), context.previousReview);
      }
    },
    
    onSettled: (data, error, { reviewId }) => {
      invalidateReviewQueries(reviewId, data?.book_id);
    },
  });
}

// Delete review mutation
export function useDeleteReview() {
  const { authUser } = useAuth();
  
  return useMutation({
    mutationFn: reviewService.deleteReview,
    
    onMutate: async (reviewId: string) => {
      // Get the review data before deletion for cleanup
      const review = queryClient.getQueryData<Review>(queryKeys.review(reviewId));
      
      if (review) {
        // Remove from book reviews list
        queryClient.setQueryData(queryKeys.bookReviews(review.book_id), (old: any) => {
          if (!old?.pages) return old;
          
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.filter((item: Review) => item.id !== reviewId),
              total: page.total - 1,
            })),
          };
        });
        
        // Remove from user reviews list
        if (authUser?.id) {
          queryClient.setQueryData(queryKeys.userReviews(authUser.id), (old: any) => {
            if (!old?.pages) return old;
            
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                items: page.items.filter((item: Review) => item.id !== reviewId),
                total: page.total - 1,
              })),
            };
          });
        }
      }
      
      return { review };
    },
    
    onError: (err, reviewId, context) => {
      // Revert optimistic updates
      if (context?.review) {
        invalidateReviewQueries(reviewId, context.review.book_id);
      }
    },
    
    onSettled: (data, error, reviewId) => {
      // Clean up the individual review query
      queryClient.removeQueries({ queryKey: queryKeys.review(reviewId) });
    },
  });
}

// Like review mutation
export function useLikeReview() {
  return useMutation({
    mutationFn: reviewService.likeReview,
    
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.review(reviewId) });
      
      const previousReview = queryClient.getQueryData<Review>(queryKeys.review(reviewId));
      
      if (previousReview) {
        queryClient.setQueryData<Review>(queryKeys.review(reviewId), {
          ...previousReview,
          current_user_has_liked: true,
          like_count: (previousReview.like_count || 0) + 1,
        });
        
        // Update in lists as well
        updateReviewInLists(reviewId, {
          current_user_has_liked: true,
          like_count: (previousReview.like_count || 0) + 1,
        });
      }
      
      return { previousReview };
    },
    
    onError: (err, reviewId, context) => {
      if (context?.previousReview) {
        queryClient.setQueryData(queryKeys.review(reviewId), context.previousReview);
        updateReviewInLists(reviewId, {
          current_user_has_liked: context.previousReview.current_user_has_liked,
          like_count: context.previousReview.like_count,
        });
      }
    },
    
    onSettled: () => {
      // Don't invalidate - optimistic updates should be sufficient
    },
  });
}

// Unlike review mutation
export function useUnlikeReview() {
  return useMutation({
    mutationFn: reviewService.unlikeReview,
    
    onMutate: async (reviewId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.review(reviewId) });
      
      const previousReview = queryClient.getQueryData<Review>(queryKeys.review(reviewId));
      
      if (previousReview) {
        queryClient.setQueryData<Review>(queryKeys.review(reviewId), {
          ...previousReview,
          current_user_has_liked: false,
          like_count: Math.max((previousReview.like_count || 0) - 1, 0),
        });
        
        // Update in lists as well
        updateReviewInLists(reviewId, {
          current_user_has_liked: false,
          like_count: Math.max((previousReview.like_count || 0) - 1, 0),
        });
      }
      
      return { previousReview };
    },
    
    onError: (err, reviewId, context) => {
      if (context?.previousReview) {
        queryClient.setQueryData(queryKeys.review(reviewId), context.previousReview);
        updateReviewInLists(reviewId, {
          current_user_has_liked: context.previousReview.current_user_has_liked,
          like_count: context.previousReview.like_count,
        });
      }
    },
    
    onSettled: () => {
      // Don't invalidate - optimistic updates should be sufficient
    },
  });
}

// Helper function to update review data in paginated lists
function updateReviewInLists(reviewId: string, updates: Partial<Review>) {
  const queryCache = queryClient.getQueryCache();
  
  queryCache.getAll().forEach((query) => {
    if (query.queryKey[0] === 'reviews' && query.queryKey.includes('book')) {
      queryClient.setQueryData(query.queryKey, (old: any) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: Review) => 
              item.id === reviewId ? { ...item, ...updates } : item
            ),
          })),
        };
      });
    }
  });
} 
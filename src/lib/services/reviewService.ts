import type { Review, Comment, PaginatedResponse } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';

const API_BASE_URL = '/api'; // Adjust

export async function getReviewDetails(reviewId: string): Promise<Review | null> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:user_profiles(*),
        book:books(*),
        current_user_has_liked:likes!left(user_id)
      `)
      .eq('id', reviewId)
      .eq('likes.user_id', currentUserId || '')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      current_user_has_liked: data.current_user_has_liked?.length > 0 || false,
    };
  } catch (error) {
    console.error('Failed to fetch review details:', error);
    throw error;
  }
}

export async function updateReview(reviewId: string, rating: number, reviewText?: string): Promise<Review> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .update({
    rating,
    review_text: reviewText,
      })
      .eq('id', reviewId)
      .eq('user_id', currentUserId) // Ensure user can only update their own review
      .select(`
        *,
        user:user_profiles(*),
        book:books(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update review:', error);
    throw error;
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // First get the review to check ownership
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id, book_id')
      .eq('id', reviewId)
      .single();

    if (!review || review.user_id !== currentUserId) {
      throw new Error('Review not found or unauthorized');
    }

    // Delete the review (this will cascade delete comments and likes due to database constraints)
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', currentUserId);

    if (error) throw error;

    // Also remove the rating from user book interaction if it was only a review
    const { data: interaction } = await supabase
      .from('user_book_interactions')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('book_id', review.book_id)
      .single();

    if (interaction && !interaction.is_read && !interaction.is_on_watchlist && !interaction.is_liked && !interaction.is_owned) {
      // If this was the only interaction, remove the rating
      await supabase
        .from('user_book_interactions')
        .update({ rating: null })
        .eq('user_id', currentUserId)
        .eq('book_id', review.book_id);
    }
  } catch (error) {
    console.error('Failed to delete review:', error);
    throw error;
  }
}

export async function likeReview(reviewId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('review_id', reviewId)
      .single();

    if (existingLike) return; // Already liked

    // Get the review to create notification
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id, book:books(title)')
      .eq('id', reviewId)
      .single();

    if (!review) throw new Error('Review not found');

    // Insert like
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: currentUserId,
        review_id: reviewId,
      });

    if (error) throw error;

    // Create notification if not liking own review
    if (review.user_id !== currentUserId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: review.user_id,
          actor_id: currentUserId,
          type: 'like_review',
          entity_type: 'review',
          entity_id: reviewId,
          entity_parent_title: (review as any).book?.title,
          read: false,
        });
    }
  } catch (error) {
    console.error('Failed to like review:', error);
    throw error;
  }
}

export async function unlikeReview(reviewId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', currentUserId)
      .eq('review_id', reviewId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to unlike review:', error);
    throw error;
  }
}

export async function getReviewComments(reviewId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Comment>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    // Get top-level comments first
    const { data, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id)
      `, { count: 'exact' })
      .eq('review_id', reviewId)
      .is('parent_comment_id', null)
      .eq('likes.user_id', currentUserId || '')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // For each top-level comment, get its replies
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment: any) => {
        const replies = await getCommentReplies(comment.id, currentUserId);
        return {
          ...comment,
          current_user_has_liked: comment.current_user_has_liked?.length > 0 || false,
          replies,
        };
      })
    );

    return {
      items: commentsWithReplies,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get review comments:', error);
    throw error;
  }
}

async function getCommentReplies(parentCommentId: string, currentUserId?: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id)
      `)
      .eq('parent_comment_id', parentCommentId)
      .eq('likes.user_id', currentUserId || '')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((reply: any) => ({
      ...reply,
      current_user_has_liked: reply.current_user_has_liked?.length > 0 || false,
    }));
  } catch (error) {
    console.error('Failed to get comment replies:', error);
    return [];
  }
}

export async function addCommentToReview(reviewId: string, text: string, parentCommentId?: string): Promise<Comment> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Get the review info for notifications
    const { data: review } = await supabase
      .from('reviews')
      .select('user_id, book:books(title)')
      .eq('id', reviewId)
      .single();

    if (!review) throw new Error('Review not found');

    // If replying to a comment, get the parent comment info
    let parentComment = null;
    if (parentCommentId) {
      const { data } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();
      parentComment = data;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: currentUserId,
    review_id: reviewId,
    parent_comment_id: parentCommentId,
    text,
      })
      .select(`
        *,
        user:user_profiles(*)
      `)
      .single();

    if (error) throw error;

    // Create notifications
    if (parentCommentId && parentComment && parentComment.user_id !== currentUserId) {
      // Notify the parent comment author
      await supabase
        .from('notifications')
        .insert({
          user_id: parentComment.user_id,
          actor_id: currentUserId,
          type: 'reply_comment',
          entity_type: 'comment',
          entity_id: data.id,
          entity_parent_id: reviewId,
          entity_parent_title: (review as any).book?.title,
          read: false,
        });
    } else if (!parentCommentId && review.user_id !== currentUserId) {
      // Notify the review author for top-level comments
      await supabase
        .from('notifications')
        .insert({
          user_id: review.user_id,
          actor_id: currentUserId,
          type: 'comment_review',
          entity_type: 'comment',
          entity_id: data.id,
          entity_parent_id: reviewId,
          entity_parent_title: (review as any).book?.title,
          read: false,
        });
    }

    return {
      ...data,
      current_user_has_liked: false,
    like_count: 0,
  };
  } catch (error) {
    console.error('Failed to add comment to review:', error);
    throw error;
  }
}

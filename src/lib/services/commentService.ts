import type { Comment } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';

const API_BASE_URL = '/api'; // Adjust

export async function likeComment(commentId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('comment_id', commentId)
      .single();

    if (existingLike) return; // Already liked

    // Get the comment to create notification
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id, review_id, list_collection_id')
      .eq('id', commentId)
      .single();

    if (!comment) throw new Error('Comment not found');

    // Insert like
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: currentUserId,
        comment_id: commentId,
      });

    if (error) throw error;

    // Create notification if not liking own comment
    if (comment.user_id !== currentUserId) {
      // Get the parent entity title for context
      let entityTitle = '';
      if (comment.review_id) {
        const { data: review } = await supabase
          .from('reviews')
          .select('book:books(title)')
          .eq('id', comment.review_id)
          .single();
        entityTitle = (review as any)?.book?.title || '';
      } else if (comment.list_collection_id) {
        const { data: list } = await supabase
          .from('list_collections')
          .select('name')
          .eq('id', comment.list_collection_id)
          .single();
        entityTitle = list?.name || '';
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: comment.user_id,
          actor_id: currentUserId,
          type: 'like_review', // Generic like notification type
          entity_type: 'comment',
          entity_id: commentId,
          entity_parent_id: comment.review_id || comment.list_collection_id,
          entity_parent_title: entityTitle,
          read: false,
        });
    }
  } catch (error) {
    console.error('Failed to like comment:', error);
    throw error;
  }
}

export async function unlikeComment(commentId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', currentUserId)
      .eq('comment_id', commentId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to unlike comment:', error);
    throw error;
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // First check if user owns the comment
    const { data: comment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!comment || comment.user_id !== currentUserId) {
      throw new Error('Comment not found or unauthorized');
    }

    // Check if this comment has replies
    const { data: replies } = await supabase
      .from('comments')
      .select('id')
      .eq('parent_comment_id', commentId);

    if (replies && replies.length > 0) {
      // If comment has replies, just mark it as deleted instead of actually deleting
      // This preserves the comment thread structure
      const { error } = await supabase
        .from('comments')
        .update({
          text: '[deleted]',
          // You might want to add a 'deleted' boolean field to the schema
        })
        .eq('id', commentId)
        .eq('user_id', currentUserId);

      if (error) throw error;
    } else {
      // If no replies, safe to delete completely
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Failed to delete comment:', error);
    throw error;
  }
}

export async function getCommentReplies(commentId: string): Promise<Comment[]> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_profiles(*),
        current_user_has_liked:likes!left(user_id)
      `)
      .eq('parent_comment_id', commentId)
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

// Add reply and edit comment would typically go into reviewService or listService
// depending on the entity the comment belongs to, or a generic comment service
// that takes entity_type and entity_id.
// For simplicity, primary comment creation is in reviewService/listService.
// This service is mainly for actions on existing comments.

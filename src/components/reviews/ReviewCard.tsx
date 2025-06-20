
"use client";

import type { Review, Comment } from '@/types'; // Assuming Comment type is available
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'; // CardTitle, CardDescription removed for cleaner look
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/button';
import { ThumbsUp, MessageSquare, Trash2, Edit, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Textarea } from '../ui/textarea';
import { CommentCard } from '../comments/CommentCard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
// Import relevant services
import { addCommentToReview, getReviewComments, deleteReview as deleteReviewService } from '@/lib/services/reviewService'; 
import { likeComment, unlikeComment, deleteComment } from '@/lib/services/commentService';

interface ReviewCardProps {
  review: Review;
  onLikeReview: (reviewId: string) => Promise<void>; // Make async
  onReplyToReview?: (reviewId: string, replyText: string) => Promise<Comment | null>; // Optional, might use internal commenting
  onEditReview?: (review: Review) => void; // To open an edit dialog/modal
  onDeleteReview?: (reviewId: string) => Promise<void>; // Make async
  showBookLink?: boolean; // To show link to book, useful in feeds or user profile review lists
}

export function ReviewCard({ review, onLikeReview, onReplyToReview, onEditReview, onDeleteReview, showBookLink = false }: ReviewCardProps) {
  const { userProfile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const timeAgo = review.created_at ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true }) : 'some time ago';
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  const [comments, setComments] = useState<Comment[]>([]); // Initialize empty, fetch when needed
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isOwnReview = isAuthenticated && userProfile?.id === review.user_id;

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0 && review.comment_count && review.comment_count > 0) { // Fetch if not shown and comments exist
        setIsLoadingComments(true);
        try {
            const fetchedComments = await getReviewComments(review.id);
            setComments(fetchedComments.items);
        } catch (error) {
            console.error("Failed to load comments:", error);
            toast({title: "Error", description: "Could not load comments.", variant: "destructive"});
        } finally {
            setIsLoadingComments(false);
        }
    }
    setShowComments(!showComments);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !isAuthenticated) return;
    setIsSubmittingReply(true);
    try {
        const newComment = await addCommentToReview(review.id, replyText);
        setComments(prev => [newComment, ...prev]);
        setReplyText('');
        setShowReplyForm(false);
        if (!showComments) setShowComments(true); // Auto-show comments after replying
        toast({title: "Reply posted"});
    } catch (error) {
        console.error("Failed to post reply:", error);
        toast({title: "Error", description: "Could not post reply.", variant: "destructive"});
    } finally {
        setIsSubmittingReply(false);
    }
  };
  
  const handleLikeNestedComment = async (commentId: string) => {
    if (!isAuthenticated) return;
    const comment = comments.find(c => c.id === commentId); // Simplified: assumes flat list or needs recursive find
    if (!comment) return;
    try {
        if(comment.current_user_has_liked) await unlikeComment(commentId); else await likeComment(commentId);
        // Re-fetch comments or update locally if API returns updated comment
        const fetchedComments = await getReviewComments(review.id);
        setComments(fetchedComments.items);
    } catch (error) {
        toast({title: "Error", description: "Failed to like comment.", variant: "destructive"});
    }
  };

  const handleAddReplyToNestedComment = async (parentCommentId: string, text: string) => {
     if (!isAuthenticated) return;
     try {
        await addCommentToReview(review.id, text, parentCommentId);
        // Re-fetch comments
        const fetchedComments = await getReviewComments(review.id);
        setComments(fetchedComments.items);
        toast({title: "Reply posted"});
     } catch (error) {
        toast({title: "Error", description: "Failed to post reply.", variant: "destructive"});
     }
  };
  
  const handleDeleteNestedComment = async (commentId: string) => {
    if (!isAuthenticated) return;
    try {
        await deleteComment(commentId);
        setComments(prev => prev.filter(c => c.id !== commentId)); // Basic removal, deep removal is harder
        toast({title: "Comment Deleted"});
    } catch (error) {
        toast({title: "Error", description: "Could not delete comment.", variant: "destructive"});
    }
  };

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="flex flex-row items-start space-x-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={review.user?.avatar_url || 'https://placehold.co/40x40.png'} alt={review.user?.username} />
          <AvatarFallback>{review.user?.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/profile/${review.user?.username || ''}`} className="text-sm font-semibold hover:underline">
                {review.user?.username || 'Unknown User'}
              </Link>
              <span className="text-xs text-muted-foreground mx-1">&bull;</span>
              <StarRating initialRating={review.rating} readonly size={14} className="inline-flex" />
            </div>
            {isOwnReview && onDeleteReview && onEditReview && (
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditReview(review)}><Edit className="h-4 w-4"/></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDeleteReview(review.id)}><Trash2 className="h-4 w-4"/></Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
          {showBookLink && review.book && (
            <p className="text-xs mt-0.5">
              Review for <Link href={`/books/${review.book.id}`} className="text-primary hover:underline font-medium">{review.book.title}</Link>
            </p>
          )}
        </div>
      </CardHeader>
      {review.review_text && (
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.review_text}</p>
        </CardContent>
      )}
      <CardFooter className="px-4 py-2 border-t flex flex-col items-start">
        <div className="flex justify-start items-center w-full space-x-3">
            {isAuthenticated && !isOwnReview ? (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`text-xs px-2 py-1 ${review.current_user_has_liked ? 'text-primary hover:text-primary/90' : 'text-muted-foreground hover:text-primary'}`}
                    onClick={() => onLikeReview(review.id)}
                >
                    <ThumbsUp className={`h-4 w-4 mr-1.5 ${review.current_user_has_liked ? 'fill-current' : ''}`} /> {review.like_count || 0}
                </Button>
            ) : (
                <div className="text-xs px-2 py-1 text-muted-foreground flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-1.5" /> {review.like_count || 0} likes
                </div>
            )}
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary text-xs px-2 py-1"
                onClick={handleToggleComments}
            >
                <MessageSquare className="h-4 w-4 mr-1.5" /> {(review.comment_count || 0) + (comments.length > 0 && !review.comment_count ? comments.length : 0)} {/* Show local count if API count is 0 */}
            </Button>
        </div>

        {showComments && (
            <div className="mt-3 w-full space-y-3 pt-3 border-t">
                {isLoadingComments ? (
                    <div className="flex justify-center items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
                ) : comments.length > 0 ? (
                    comments.map(comment => (
                        <CommentCard 
                            key={comment.id} 
                            comment={comment}
                            onLikeComment={handleLikeNestedComment} 
                            onAddReply={handleAddReplyToNestedComment}
                            onDeleteComment={handleDeleteNestedComment}
                            currentUserId={userProfile?.id}
                            entityOwnerId={review.user_id} // Review owner can also manage comments on their review
                            indentLevel={0} 
                        />
                    ))
                ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>
                )}
                {isAuthenticated && (
                  <>
                    {!showReplyForm && <Button variant="link" size="sm" onClick={() => setShowReplyForm(true)} className="mt-2 text-xs">Write a comment...</Button>}
                    {showReplyForm && (
                      <form onSubmit={handleReplySubmit} className="w-full mt-2 space-y-2">
                        <Textarea 
                          placeholder={`Comment on ${review.user?.username || 'user'}'s review...`} 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowReplyForm(false)} disabled={isSubmittingReply}>Cancel</Button>
                          <Button type="submit" size="sm" disabled={isSubmittingReply || !replyText.trim()}>
                            {isSubmittingReply && <Loader2 className="mr-1 h-3 w-3 animate-spin"/>}
                            Post Comment
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
            </div>
        )}
      </CardFooter>
    </Card>
  );
}

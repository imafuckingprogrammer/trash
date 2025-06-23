
"use client";

import type { Comment } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'; // Removed CardTitle, CardDescription
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, MessageSquare, CornerDownRight, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/OptimizedAuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CommentCardProps {
  comment: Comment;
  onLikeComment: (commentId: string) => void;
  onAddReply: (parentCommentId: string, replyText: string) => void;
  onDeleteComment: (commentId: string) => void;
  currentUserId?: string;
  entityOwnerId?: string; // ID of the user who owns the list/review this comment is on
  indentLevel?: number;
}

export function CommentCard({ 
  comment, 
  onLikeComment, 
  onAddReply,
  onDeleteComment,
  currentUserId,
  entityOwnerId,
  indentLevel = 0, 
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAuthenticated } = useAuth();
  
  const timeAgo = comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 'unknown';

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !isAuthenticated) return;
    setIsSubmittingReply(true);
    try {
        await onAddReply(comment.id, replyText);
        setReplyText('');
        setShowReplyForm(false);
    } catch (error) {
        console.error("Failed to submit reply:", error);
        // Toast handled by parent
    } finally {
        setIsSubmittingReply(false);
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
        await onDeleteComment(comment.id);
        // Toast handled by parent
    } catch (error) {
        console.error("Failed to delete comment:", error);
    } finally {
        setIsDeleting(false); // AlertDialog will close on success, this is for error cases if it doesn't
    }
  };

  const canDelete = isAuthenticated && (comment.user_id === currentUserId || entityOwnerId === currentUserId);

  return (
    <Card 
      className={`shadow-sm rounded-lg ${indentLevel === 0 ? 'bg-card' : 'bg-secondary/30'}`}
      style={{ marginLeft: indentLevel > 0 ? `${Math.min(indentLevel * 20, 60)}px` : '0px' }} // Cap max indent
    >
      <CardHeader className="flex flex-row items-start space-x-3 p-3">
        {indentLevel > 0 && <CornerDownRight className="h-4 w-4 text-muted-foreground mt-1.5 mr-1 shrink-0" />}
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.user?.avatar_url || `https://placehold.co/40x40.png`} alt={comment.user?.username} />
          <AvatarFallback>{comment.user?.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
                <Link href={`/profile/${comment.user?.username || ''}`} className="text-sm font-semibold hover:underline">
                    {comment.user?.username || 'Unknown User'}
                </Link>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
            {canDelete && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2 pt-0 ml-[calc(2rem+0.75rem+0.25rem)]"> {/* Align with username */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>
      </CardContent>
      {isAuthenticated && (
        <CardFooter className="px-3 py-2 border-t ml-[calc(2rem+0.75rem+0.25rem)]">
            <div className="flex items-center space-x-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className={`text-xs px-1.5 py-1 ${comment.current_user_has_liked ? 'text-primary hover:text-primary/90' : 'text-muted-foreground hover:text-primary'}`}
                onClick={() => onLikeComment(comment.id)}
            >
                <ThumbsUp className={`h-3.5 w-3.5 mr-1 ${comment.current_user_has_liked ? 'fill-current' : ''}`} /> {comment.like_count || 0}
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary text-xs px-1.5 py-1"
                onClick={() => setShowReplyForm(!showReplyForm)}
            >
                <MessageSquare className="h-3.5 w-3.5 mr-1" /> Reply
            </Button>
            </div>
        </CardFooter>
      )}
      {showReplyForm && isAuthenticated && (
        <div className="px-3 pb-3 pt-1 ml-[calc(2rem+0.75rem+0.25rem)]">
            <form onSubmit={handleReplySubmit} className="space-y-1.5">
            <Textarea 
                placeholder={`Reply to ${comment.user?.username || 'user'}...`} 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[50px] text-sm p-1.5"
            />
            <div className="flex justify-end space-x-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowReplyForm(false)} disabled={isSubmittingReply}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isSubmittingReply || !replyText.trim()}>
                    {isSubmittingReply && <Loader2 className="mr-1 h-3 w-3 animate-spin"/>}
                    Post Reply
                </Button>
            </div>
            </form>
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pt-2 border-t"> {/* No extra padding, CommentCard handles its own margins */}
          {comment.replies.map(reply => (
            <CommentCard 
              key={reply.id} 
              comment={reply} 
              onLikeComment={onLikeComment}
              onAddReply={onAddReply}
              onDeleteComment={onDeleteComment}
              currentUserId={currentUserId}
              entityOwnerId={entityOwnerId}
              indentLevel={indentLevel + 1}
            />
          ))}
        </div>
      )}
    </Card>
  );
}


"use client";

import { useState, useEffect, type FormEvent, useCallback } from 'react';
import type { ListCollection, Book, Comment as CommentType, PaginatedResponse } from '@/types';
import { BookCard } from '@/components/books/BookCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThumbsUp, Share2, MessageCircle, Eye, EyeOff, ArrowDownAZ, ArrowUpAZ, Loader2, Edit3, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CommentCard } from '@/components/comments/CommentCard';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getListDetails, getListBooks, updateListDetails, likeList, unlikeList, getListComments, addCommentToList, deleteList as deleteListService, removeBookFromList as removeBookFromListService } from '@/lib/services/listService';
import { likeComment as likeCommentService, unlikeComment as unlikeCommentService, deleteComment as deleteCommentService } from '@/lib/services/commentService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from "@/components/ui/alert-dialog";


export default function ListDetailsPage({ params }: { params: { id:string } }) {
  const { toast } = useToast();
  const { userProfile, isAuthenticated } = useAuth();
  const router = useRouter();
  const listId = params.id;

  const [listData, setListData] = useState<ListCollection | null>(null);
  const [listBooks, setListBooks] = useState<Book[]>([]);
  const [listComments, setListComments] = useState<CommentType[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [commentText, setCommentText] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false); // For editing list name/desc

  const fetchListAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [details, booksResponse, commentsResponse] = await Promise.all([
        getListDetails(listId),
        getListBooks(listId), // Assuming this fetches all books for now, or first page
        getListComments(listId) // Assuming this fetches all comments for now, or first page
      ]);

      if (!details) {
        setError("List not found.");
        toast({ title: "Error", description: "List not found.", variant: "destructive" });
        setListData(null);
        return;
      }
      setListData(details);
      setListBooks(booksResponse.items);
      setListComments(commentsResponse.items);

    } catch (err) {
      console.error("Failed to fetch list data:", err);
      setError("Could not load list details.");
      toast({ title: "Error", description: "Could not load list details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [listId, toast]);

  useEffect(() => {
    fetchListAllData();
  }, [fetchListAllData]);

  // For editing list name/description
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  useEffect(() => {
    if (listData) {
        setEditName(listData.name);
        setEditDescription(listData.description || "");
    }
  }, [listData]);


  const handleLikeList = async () => {
    if (!isAuthenticated || !listData) return;
    const originalLikedState = listData.current_user_has_liked;
    const originalLikeCount = listData.like_count || 0;

    // Optimistic update
    setListData(prev => prev ? { 
        ...prev, 
        current_user_has_liked: !originalLikedState,
        like_count: originalLikedState ? originalLikeCount - 1 : originalLikeCount + 1,
        updated_at: new Date().toISOString() 
    } : null);

    try {
        if (originalLikedState) {
            await unlikeList(listData.id);
        } else {
            await likeList(listData.id);
        }
        // Optionally re-fetch list details to confirm, or rely on optimistic update
        // fetchListAllData(); 
    } catch (error) {
        console.error("Failed to (un)like list:", error);
        toast({ title: "Error", description: "Could not update like status.", variant: "destructive" });
        // Revert optimistic update on error
        setListData(prev => prev ? { ...prev, current_user_has_liked: originalLikedState, like_count: originalLikeCount } : null);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!listData || listData.user_id !== userProfile?.id) return;
    const newIsPublic = !listData.is_public;
    try {
      const updatedList = await updateListDetails(listData.id, { is_public: newIsPublic });
      setListData(updatedList);
      toast({ title: `List is now ${newIsPublic ? 'Public' : 'Private'}` });
    } catch (error) {
      toast({ title: "Error", description: "Could not update list privacy.", variant: "destructive"});
    }
  };

  const handleSaveListDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!listData || listData.user_id !== userProfile?.id) return;
    try {
        const updatedList = await updateListDetails(listData.id, { name: editName, description: editDescription });
        setListData(updatedList);
        setIsEditingDetails(false);
        toast({ title: "List Updated", description: "Your list details have been saved." });
    } catch (error) {
        toast({ title: "Error", description: "Could not save list details.", variant: "destructive" });
    }
  };
  
  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !listData || !isAuthenticated) return;
    try {
        const newComment = await addCommentToList(listData.id, commentText);
        setListComments(prev => [newComment, ...prev]); // Add to top
        setCommentText('');
        toast({ title: "Comment posted!"});
    } catch (error) {
        toast({ title: "Error", description: "Could not post comment.", variant: "destructive" });
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) return;
    // Find comment and its original state for optimistic update
    const findAndUpdateComment = (comments: CommentType[], id: string): CommentType[] => {
        return comments.map(c => {
            if (c.id === id) {
                const newLikedState = !c.current_user_has_liked;
                const newLikesCount = (c.like_count || 0) + (newLikedState ? 1 : -1);
                // Optimistic update
                setTimeout(async () => { // Make async call after optimistic update
                    try {
                        if (newLikedState) await likeCommentService(id); else await unlikeCommentService(id);
                        // fetchListAllData(); // Or just comments
                    } catch (err) {
                        console.error("Comment like error:", err);
                        // Revert optimistic update (more complex UI needed for this)
                        toast({title:"Error", description:"Failed to update like.", variant:"destructive"});
                        fetchListAllData(); // Re-fetch to correct
                    }
                },0);
                return { ...c, like_count: newLikesCount < 0 ? 0 : newLikesCount, current_user_has_liked: newLikedState };
            }
            if (c.replies && c.replies.length > 0) {
                return { ...c, replies: findAndUpdateComment(c.replies, id) };
            }
            return c;
        });
    };
    setListComments(prev => findAndUpdateComment(prev, commentId));
  };

  const handleAddReplyToComment = async (parentCommentId: string, replyText: string) => {
    if (!isAuthenticated || !listData) return;
     try {
        // Assuming addCommentToList can handle parent_comment_id for replies
        const newReply = await addCommentToList(listData.id, replyText, parentCommentId);
        
        // Update local state (this is complex for nested replies)
        // A better approach would be to re-fetch comments for that parent or the whole list
        fetchListAllData(); // Simplest way to refresh comments with new reply
        toast({ title: "Reply posted!" });
    } catch (error) {
        toast({ title: "Error", description: "Could not post reply.", variant: "destructive" });
    }
  };
  
  const handleDeleteComment = async (commentId: string) => {
    if(!isAuthenticated || !listData) return;
    // Add confirmation dialog before deleting
    try {
        await deleteCommentService(commentId);
        setListComments(prev => prev.filter(c => c.id !== commentId || (c.replies && c.replies.filter(r => r.id !== commentId))));
        fetchListAllData(); // Re-fetch to ensure clean state with nested replies
        toast({title: "Comment Deleted"});
    } catch (error) {
        toast({title:"Error", description: "Could not delete comment.", variant: "destructive"});
    }
  };

  const sortBooksByTitle = (ascending = true) => {
    const sorted = [...listBooks].sort((a, b) => {
      if (ascending) return a.title.localeCompare(b.title);
      return b.title.localeCompare(a.title);
    });
    setListBooks(sorted);
  };
  
  const handleRemoveBook = async (bookIdToRemove: string) => {
    if (!listData || !isAuthenticated || listData.user_id !== userProfile?.id) return;
    try {
        await removeBookFromListService(listData.id, bookIdToRemove);
        setListBooks(prev => prev.filter(b => b.id !== bookIdToRemove));
        // Update item_count in listData locally
        setListData(prev => prev ? {...prev, item_count: (prev.item_count || 0) - 1} : null);
        toast({title: "Book Removed", description: "The book has been removed from this list."});
    } catch (error) {
        toast({title:"Error", description: "Could not remove book from list.", variant: "destructive"});
    }
  };

  const handleDeleteEntireList = async () => {
    if (!listData || !isAuthenticated || listData.user_id !== userProfile?.id) return;
    try {
        await deleteListService(listData.id);
        toast({title: "List Deleted", description: `"${listData.name}" has been deleted.`});
        router.push('/lists');
    } catch (error) {
        toast({title:"Error", description: "Could not delete the list.", variant: "destructive"});
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error || !listData) {
    return <div className="text-center py-10 text-destructive">{error || "List could not be loaded."}</div>;
  }

  const timeAgo = listData.updated_at ? formatDistanceToNow(new Date(listData.updated_at), { addSuffix: true }) : 'unknown';
  const isOwner = isAuthenticated && userProfile?.id === listData.user_id;

  return (
    <div className="space-y-8">
      <Card className="bg-card p-6 md:p-8 rounded-lg shadow-xl">
        {isEditingDetails && isOwner ? (
            <form onSubmit={handleSaveListDetails} className="space-y-4">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-4xl font-bold font-headline" />
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="List description..." className="text-lg"/>
                <div className="flex gap-2">
                    <Button type="submit">Save Changes</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsEditingDetails(false); setEditName(listData.name); setEditDescription(listData.description || ""); }}>Cancel</Button>
                </div>
            </form>
        ) : (
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
            <div>
                <h1 className="text-4xl font-bold mb-2 font-headline text-primary">{listData.name}</h1>
                {listData.user && (
                <div className="flex items-center space-x-2 text-md text-muted-foreground mb-1">
                <Avatar className="h-7 w-7">
                    <AvatarImage src={listData.user.avatar_url || `https://placehold.co/40x40.png`} alt={listData.user.username}  />
                    <AvatarFallback>{listData.user.username?.substring(0,1)?.toUpperCase() || 'L'}</AvatarFallback>
                </Avatar>
                <Link href={`/profile/${listData.user.username}`} className="hover:underline">Created by {listData.user.username}</Link>
                <span>&bull;</span>
                <span>Updated {timeAgo}</span>
                </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-3">
                    {listData.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span>{listData.is_public ? 'Public List' : 'Private List'}</span>
                </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
                {isAuthenticated && (
                <Button 
                    variant="outline" 
                    className={`transition-transform hover:scale-105 ${listData.current_user_has_liked ? 'text-primary border-primary' : ''}`} 
                    onClick={handleLikeList}
                >
                <ThumbsUp className={`mr-2 h-4 w-4 ${listData.current_user_has_liked ? 'fill-current' : ''}`} /> Like ({listData.like_count || 0})
                </Button>
                )}
                {isOwner && (
                    <>
                    <Button variant="outline" size="icon" onClick={() => setIsEditingDetails(true)} title="Edit list details"><Edit3 className="h-4 w-4"/></Button>
                    <div className="flex items-center space-x-2 border p-2 rounded-md">
                        <Switch id="privacy-toggle" checked={listData.is_public} onCheckedChange={handleTogglePrivacy} />
                        <Label htmlFor="privacy-toggle" className="text-sm cursor-pointer">Public</Label>
                    </div>
                    </>
                )}
                <Button variant="outline" size="icon" className="transition-transform hover:scale-105" title="Share (not implemented)">
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share List</span>
                </Button>
            </div>
            </div>
        )}
        {listData.description && !isEditingDetails && <p className="text-lg text-foreground/80 mb-6 whitespace-pre-wrap">{listData.description}</p>}
        
      </Card>

      <Separator />

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-headline">Books in this List ({listBooks.length})</h2>
          {listBooks.length > 1 && (
            <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => sortBooksByTitle(true)}><ArrowDownAZ className="mr-2 h-4 w-4" />Title A-Z</Button>
                <Button variant="outline" size="sm" onClick={() => sortBooksByTitle(false)}><ArrowUpAZ className="mr-2 h-4 w-4" />Title Z-A</Button>
            </div>
          )}
        </div>
        {listBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {listBooks.map((book) => (
              <div key={book.id} className="relative group">
                <BookCard book={book} />
                {isOwner && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-7 w-7">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Remove Book?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to remove "{book.title}" from this list? This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveBook(book.id!)}>Remove Book</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">This list is currently empty. {isOwner && <Link href="/discover" className="text-primary hover:underline">Add some books!</Link>}</p>
        )}
      </section>

      <Separator />

      <section>
        <h2 className="text-2xl font-bold mb-4 font-headline">Comments ({listComments.length || 0})</h2>
        {isAuthenticated ? (
            <Card className="shadow">
                <CardHeader>
                    <CardTitle>Leave a Comment</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddComment} className="space-y-3">
                        <Textarea
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <Button type="submit" className="transition-transform hover:scale-105">
                            <MessageCircle className="mr-2 h-4 w-4" /> Post Comment
                        </Button>
                    </form>
                </CardContent>
            </Card>
        ) : (
            <p className="text-muted-foreground text-sm">Please <Link href="/login" className="text-primary hover:underline">log in</Link> to leave a comment.</p>
        )}
        <div className="mt-6 space-y-4">
          {(listComments && listComments.length > 0) ? (
            listComments.map((comment) => (
              <CommentCard 
                key={comment.id} 
                comment={comment} 
                onLikeComment={handleLikeComment}
                onAddReply={handleAddReplyToComment}
                onDeleteComment={handleDeleteComment}
                currentUserId={userProfile?.id}
                entityOwnerId={listData.user_id} // For permissions on delete
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </section>
      
      {isOwner && (
        <>
            <Separator />
            <section className="mt-8 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete This List</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the list "{listData.name}" and all of its associated data.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEntireList} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Yes, delete this list
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-destructive/80 mt-2">Deleting a list is permanent.</p>
            </section>
        </>
      )}
    </div>
  );
}

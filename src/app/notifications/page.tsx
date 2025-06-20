"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, BellRing, CheckCheck } from 'lucide-react';
import type { Notification, PaginatedResponse } from '@/types';
import { getNotifications, markNotificationsAsRead } from '@/lib/services/userService';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

function NotificationItem({ notification }: { notification: Notification }) {
  // Determine link and refine text based on notification type
  let href = "#";
  let actionText = "";

  switch (notification.type) {
    case 'new_follower':
      href = `/profile/${notification.actor?.username}`;
      actionText = "started following you.";
      break;
    case 'like_review':
      // Assuming entity_id is review_id and entity_parent_id is book_id for context
      href = `/books/${notification.entity_parent_id}#review-${notification.entity_id}`; 
      actionText = `liked your review on "${notification.entity_parent_title || 'a book'}".`;
      break;
    case 'comment_review':
      href = `/books/${notification.entity_parent_id}#review-comment-${notification.entity_id}`;
      actionText = `commented on your review of "${notification.entity_parent_title || 'a book'}".`;
      break;
    case 'reply_comment':
      href = `/books/${notification.entity_parent_id}#comment-${notification.entity_id}`;
      actionText = `replied to your comment on "${notification.entity_parent_title || 'a book'}".`;
      break;
    case 'like_list':
      href = `/lists/${notification.entity_id}`;
      actionText = `liked your list "${notification.entity_parent_title || 'Untitled List'}".`;
      break;
    case 'comment_list':
      href = `/lists/${notification.entity_parent_id}#comment-${notification.entity_id}`;
      actionText = `commented on your list "${notification.entity_parent_title || 'Untitled List'}".`;
      break;
    default:
      actionText = "interacted with your content.";
  }

  return (
    <Link href={href} className={`block p-4 rounded-lg transition-colors ${notification.read ? 'bg-card hover:bg-muted/50' : 'bg-primary/10 hover:bg-primary/20'}`}>
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={notification.actor?.avatar_url || 'https://placehold.co/40x40.png'} alt={notification.actor?.username} />
          <AvatarFallback>{notification.actor?.username?.substring(0,1)?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-semibold">{notification.actor?.username || 'Someone'}</span> {actionText}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.read && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 self-start shrink-0"></div>}
      </div>
    </Link>
  );
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated]);

  const loadNotifications = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoadingNotifications(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const data = await getNotifications(page, 10);
      
      if (append) {
        setNotifications(prev => [...prev, ...data.items]);
      } else {
        setNotifications(data.items);
      }
      
      setHasMore(page < data.totalPages);
      setCurrentPage(page);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError("Could not load notifications.");
    } finally {
      setIsLoadingNotifications(false);
      setIsLoadingMore(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err: any) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      loadNotifications(currentPage + 1, true);
    }
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline text-primary">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {isLoadingNotifications ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg shadow-sm">
          <BellRing className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No new notifications</h2>
          <p className="text-muted-foreground">It's all quiet on this front.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
      
      {notifications.length > 0 && hasMore && (
         <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={handleLoadMore} 
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}


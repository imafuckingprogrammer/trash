
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Newspaper } from 'lucide-react';
// import { getHomeFeed } from '@/lib/services/userService'; // Uncomment when backend is ready
// import type { PaginatedResponse, FeedItemType } from '@/types'; // Define FeedItemType

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  // const [feedItems, setFeedItems] = useState<FeedItemType[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingFeed(true);
      // getHomeFeed()
      //   .then(data => {
      //     setFeedItems(data.items);
      //     setError(null);
      //   })
      //   .catch(err => {
      //     console.error("Error fetching feed:", err);
      //     setError("Could not load your feed at this time.");
      //   })
      //   .finally(() => setIsLoadingFeed(false));
      
      // Placeholder:
      setTimeout(() => setIsLoadingFeed(false), 1000); // Simulate loading
    }
  }, [isAuthenticated]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline text-primary">Your Feed</h1>
        {/* Add controls like "Filter feed" or "Post update" if applicable */}
      </div>

      {isLoadingFeed ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading your feed...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : ( // feedItems.length === 0 once API is connected
        <div className="text-center py-16 bg-card rounded-lg shadow-sm">
          <Newspaper className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">It's a bit quiet here...</h2>
          <p className="text-muted-foreground mb-4">
            Follow some friends or interact with books and lists to see updates in your feed.
          </p>
          <div className="space-x-2">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm">Discover People</button>
            <button className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md text-sm">Explore Books</button>
          </div>
        </div>
      )}

      {/* When feedItems exist:
      <div className="space-y-6">
        {feedItems.map(item => (
          // <FeedItemCard key={item.id} item={item} /> // Create FeedItemCard component
          <div key={item.id} className="p-4 bg-card rounded-lg shadow">Placeholder feed item</div>
        ))}
      </div>
      {feedItems.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="outline">Load More</Button>
        </div>
      )}
      */}
    </div>
  );
}

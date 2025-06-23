"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/OptimizedAuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Newspaper, TrendingUp, Star, BookOpen, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCard } from '@/components/books/BookCard';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { CurrentlyReadingPanel } from '@/components/books/CurrentlyReadingPanel';
import { getPopularBooks, getRecentlyReviewedBooks, markAsCurrentlyReading, removeFromCurrentlyReading } from '@/lib/services/bookService';
import { getTopReviewsThisWeek, getTopBooksThisWeek, likeReview, unlikeReview } from '@/lib/services/reviewService';
import type { Book, Review } from '@/types';
import { useToast } from "@/hooks/use-toast";

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Popular content state
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [recentlyReviewedBooks, setRecentlyReviewedBooks] = useState<Book[]>([]);
  const [topReviewsThisWeek, setTopReviewsThisWeek] = useState<Review[]>([]);
  const [topBooksThisWeek, setTopBooksThisWeek] = useState<Book[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPopularContent();
      // Simulate loading feed for now
      setTimeout(() => setIsLoadingFeed(false), 1000);
    }
  }, [isAuthenticated]);

  const loadPopularContent = async () => {
    try {
      setLoadingPopular(true);
      const [popular, recentlyReviewed, topReviews, topBooks] = await Promise.all([
        getPopularBooks(8),
        getRecentlyReviewedBooks(6),
        getTopReviewsThisWeek(5),
        getTopBooksThisWeek(6)
      ]);
      
      setPopularBooks(popular);
      setRecentlyReviewedBooks(recentlyReviewed);
      setTopReviewsThisWeek(topReviews);
      setTopBooksThisWeek(topBooks);
    } catch (error) {
      console.error('Failed to load popular content:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  const handleCurrentlyReadingToggle = async (bookId: string, isCurrentlyReading: boolean) => {
    try {
      if (isCurrentlyReading) {
        await markAsCurrentlyReading(bookId);
        toast({
          title: "Added to Currently Reading",
          description: "Book has been added to your currently reading list.",
        });
      } else {
        await removeFromCurrentlyReading(bookId);
        toast({
          title: "Removed from Currently Reading",
          description: "Book has been removed from your currently reading list.",
        });
      }
      
      // Update books in all sections
      const updateBook = (book: Book) => 
        (book.id || book.google_book_id) === bookId 
          ? { ...book, currentUserIsCurrentlyReading: isCurrentlyReading }
          : book;
      
      setPopularBooks(prev => prev.map(updateBook));
      setRecentlyReviewedBooks(prev => prev.map(updateBook));
      setTopBooksThisWeek(prev => prev.map(updateBook));
    } catch (error) {
      console.error('Failed to update currently reading status:', error);
      toast({
        title: "Error",
        description: "Failed to update reading status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    try {
      // Find the current review to check if it's already liked
      const currentReview = topReviewsThisWeek.find(review => review.id === reviewId);
      const isCurrentlyLiked = currentReview?.current_user_has_liked || false;
      
      if (isCurrentlyLiked) {
        await unlikeReview(reviewId);
        toast({
          title: "Review Unliked",
          description: "You unliked this review.",
        });
      } else {
        await likeReview(reviewId);
        toast({
          title: "Review Liked",
          description: "You liked this review.",
        });
      }
      
      // Update the review in the state
      setTopReviewsThisWeek(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                current_user_has_liked: !isCurrentlyLiked,
                like_count: !isCurrentlyLiked 
                  ? (review.like_count || 0) + 1 
                  : Math.max((review.like_count || 0) - 1, 0)
              }
            : review
        )
      );
    } catch (error) {
      console.error('Failed to update review like status:', error);
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive",
      });
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
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline text-primary">Your Feed</h1>
      </div>

      {/* Currently Reading Panel */}
      <CurrentlyReadingPanel />

      {/* Main Feed Content */}
      {isLoadingFeed ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading your feed...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-lg shadow-sm">
          <Newspaper className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">It's a bit quiet here...</h2>
          <p className="text-muted-foreground mb-4">
            Follow some friends or interact with books and lists to see updates in your feed.
          </p>
          <div className="space-x-2">
            <button 
              onClick={() => router.push('/search/users')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm"
            >
              Discover People
            </button>
            <button 
              onClick={() => router.push('/discover')}
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md text-sm"
            >
              Explore Books
            </button>
          </div>
        </div>
      )}

      {/* Popular Content Section */}
      <div className="space-y-8">
        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPopular ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {popularBooks.map((book, index) => (
                  <BookCard 
                    key={`popular-${book.id || book.google_book_id}-${index}`} 
                    book={book} 
                    onCurrentlyReadingToggle={handleCurrentlyReadingToggle}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Reviews This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Reviews This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPopular ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : topReviewsThisWeek.length > 0 ? (
              <div className="space-y-4">
                {topReviewsThisWeek.map((review, index) => (
                  <ReviewCard key={`review-${review.id}-${index}`} review={review} onLikeReview={handleLikeReview} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No popular reviews this week yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Trending Books This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Trending Books This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPopular ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : topBooksThisWeek.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {topBooksThisWeek.map((book, index) => (
                  <BookCard 
                    key={`trending-${book.id || book.google_book_id}-${index}`} 
                    book={book} 
                    onCurrentlyReadingToggle={handleCurrentlyReadingToggle}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No trending books this week yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recently Reviewed Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recently Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPopular ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentlyReviewedBooks.map((book, index) => (
                  <BookCard 
                    key={`recent-${book.id || book.google_book_id}-${index}`} 
                    book={book} 
                    onCurrentlyReadingToggle={handleCurrentlyReadingToggle}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

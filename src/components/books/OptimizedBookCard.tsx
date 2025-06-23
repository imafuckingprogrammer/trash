import React, { useCallback, useMemo } from 'react';
import type { Book } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, BookOpenCheck, Heart, Plus, Check } from 'lucide-react';
import { ComponentErrorBoundary } from '@/components/ui/error-boundary';
import { BookCardSkeleton } from '@/components/ui/loading';
import { 
  useLikeBook, 
  useUnlikeBook, 
  useMarkAsCurrentlyReading, 
  useRemoveFromCurrentlyReading,
  useAddToWatchlist,
  useRemoveFromWatchlist 
} from '@/hooks/queries/useBooks';

interface BookCardProps {
  book: Book;
  showInteractionButtons?: boolean;
  priority?: boolean; // For above-the-fold images
  className?: string;
}

// Memoized action buttons component
const BookActionButtons = React.memo(({ 
  book, 
  bookId 
}: { 
  book: Book; 
  bookId: string; 
}) => {
  const likeMutation = useLikeBook();
  const unlikeMutation = useUnlikeBook();
  const markCurrentlyReadingMutation = useMarkAsCurrentlyReading();
  const removeCurrentlyReadingMutation = useRemoveFromCurrentlyReading();
  const addToWatchlistMutation = useAddToWatchlist();
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  const handleLikeToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (book.currentUserIsLiked) {
        await unlikeMutation.mutateAsync(bookId);
      } else {
        await likeMutation.mutateAsync(bookId);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [book.currentUserIsLiked, bookId, likeMutation, unlikeMutation]);

  const handleCurrentlyReadingToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (book.currentUserIsCurrentlyReading) {
        await removeCurrentlyReadingMutation.mutateAsync(bookId);
      } else {
        await markCurrentlyReadingMutation.mutateAsync(bookId);
      }
    } catch (error) {
      console.error('Failed to toggle currently reading:', error);
    }
  }, [book.currentUserIsCurrentlyReading, bookId, markCurrentlyReadingMutation, removeCurrentlyReadingMutation]);

  const handleWatchlistToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (book.currentUserIsOnWatchlist) {
        await removeFromWatchlistMutation.mutateAsync(bookId);
      } else {
        await addToWatchlistMutation.mutateAsync(bookId);
      }
    } catch (error) {
      console.error('Failed to toggle watchlist:', error);
    }
  }, [book.currentUserIsOnWatchlist, bookId, addToWatchlistMutation, removeFromWatchlistMutation]);

  return (
    <div className="flex gap-1">
      <Button
        variant={book.currentUserIsLiked ? "default" : "outline"}
        size="sm"
        onClick={handleLikeToggle}
        disabled={likeMutation.isPending || unlikeMutation.isPending}
        className="flex-1"
      >
        <Heart 
          className={`h-3 w-3 mr-1 ${book.currentUserIsLiked ? 'fill-current' : ''}`} 
        />
        Like
      </Button>
      
      <Button
        variant={book.currentUserIsCurrentlyReading ? "default" : "outline"}
        size="sm"
        onClick={handleCurrentlyReadingToggle}
        disabled={markCurrentlyReadingMutation.isPending || removeCurrentlyReadingMutation.isPending}
        className="flex-1"
      >
        <BookOpenCheck className="h-3 w-3 mr-1" />
        {book.currentUserIsCurrentlyReading ? 'Reading' : 'Start'}
      </Button>
      
      <Button
        variant={book.currentUserIsOnWatchlist ? "default" : "outline"}
        size="sm"
        onClick={handleWatchlistToggle}
        disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
      >
        {book.currentUserIsOnWatchlist ? (
          <Check className="h-3 w-3" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
});

BookActionButtons.displayName = 'BookActionButtons';

// Memoized book badges component
const BookBadges = React.memo(({ book }: { book: Book }) => {
  const badges = useMemo(() => {
    const badgeList = [];
    
    if (book.currentUserIsCurrentlyReading) {
      badgeList.push(
        <Badge key="currently-reading" className="bg-primary text-primary-foreground">
          Currently Reading
        </Badge>
      );
    }
    
    if (book.currentUserIsRead) {
      badgeList.push(
        <Badge key="read" className="bg-green-600 text-white">
          Read
        </Badge>
      );
    }
    
    if (book.currentUserIsOnWatchlist) {
      badgeList.push(
        <Badge key="watchlist" variant="secondary">
          Watchlist
        </Badge>
      );
    }
    
    return badgeList;
  }, [book.currentUserIsCurrentlyReading, book.currentUserIsRead, book.currentUserIsOnWatchlist]);

  if (badges.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1">
      {badges}
    </div>
  );
});

BookBadges.displayName = 'BookBadges';

// Memoized rating component
const BookRating = React.memo(({ 
  averageRating, 
  currentUserRating 
}: { 
  averageRating?: number; 
  currentUserRating?: number; 
}) => {
  const showAverageRating = useMemo(() => 
    typeof averageRating === 'number' && averageRating > 0, 
    [averageRating]
  );

  if (!showAverageRating && !currentUserRating) return null;

  return (
    <div className="space-y-1">
      {showAverageRating && (
        <div className="flex items-center">
          <StarRating initialRating={averageRating!} readonly size={16} />
          <span className="ml-2 text-xs text-muted-foreground">
            ({averageRating!.toFixed(1)})
          </span>
        </div>
      )}
      {currentUserRating && (
        <div className="flex items-center">
          <span className="text-xs text-muted-foreground mr-2">Your rating:</span>
          <StarRating initialRating={currentUserRating} readonly size={14} />
        </div>
      )}
    </div>
  );
});

BookRating.displayName = 'BookRating';

// Main optimized BookCard component
export const OptimizedBookCard = React.memo<BookCardProps>(({ 
  book, 
  showInteractionButtons = false,
  priority = false,
  className = ""
}) => {
  // Memoize the book ID calculation
  const bookId = useMemo(() => {
    return book.id || book.google_book_id || book.open_library_id;
  }, [book.id, book.google_book_id, book.open_library_id]);

  // Memoize the book link
  const bookLink = useMemo(() => `/books/${bookId}`, [bookId]);

  // Memoize the author display
  const authorDisplay = useMemo(() => 
    book.author || 'Unknown Author', 
    [book.author]
  );

  // Early return for incomplete data
  if (!bookId) {
    return (
      <div className="p-2 border rounded text-xs text-destructive">
        Book data incomplete
      </div>
    );
  }

  return (
    <ComponentErrorBoundary componentName="BookCard">
      <Card className={`flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg ${className}`}>
        <Link href={bookLink} className="block group">
          <CardHeader className="p-0 relative">
            <div className="aspect-[2/3] w-full relative bg-muted flex items-center justify-center rounded-lg overflow-hidden">
              {book.coverImageUrl ? (
                <Image
                  src={book.coverImageUrl}
                  alt={`Cover of ${book.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-lg"
                  priority={priority}
                  loading={priority ? "eager" : "lazy"}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq5TaULe4t7iGa3nRJYpVDo6MCrKwyCCOoIr6hqGjnMeZLvUdQnuZmLzTzO7u7HqWYkk/JJ/NaGjUjJvqjFfZdHWjTlHdoJeIrIpClh4U/Io="
                />
              ) : (
                <BookOpen className="w-1/2 h-1/2 text-muted-foreground/50" />
              )}
            </div>
            <BookBadges book={book} />
          </CardHeader>
        </Link>
        
        <CardContent className="p-4 flex-grow">
          <Link href={bookLink} className="block">
            <CardTitle 
              className="text-lg font-headline leading-tight mb-1 hover:text-primary transition-colors line-clamp-2" 
              title={book.title}
            >
              {book.title}
            </CardTitle>
          </Link>
          
          <p 
            className="text-sm text-muted-foreground mb-2 line-clamp-1" 
            title={authorDisplay}
          >
            by {authorDisplay}
          </p>
          
          <BookRating 
            averageRating={book.averageRating} 
            currentUserRating={book.currentUserRating} 
          />
        </CardContent>
        
        <CardFooter className="p-4 border-t space-y-2">
          {showInteractionButtons ? (
            <BookActionButtons book={book} bookId={bookId} />
          ) : (
            <Link href={bookLink} className="w-full">
              <Button variant="outline" className="w-full transition-colors duration-200">
                View Details
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </ComponentErrorBoundary>
  );
});

OptimizedBookCard.displayName = 'OptimizedBookCard';

// Export both for backward compatibility
export { OptimizedBookCard as BookCard };
export default OptimizedBookCard; 
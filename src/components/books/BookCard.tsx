
import type { Book } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const bookId = book.id || book.google_book_id || book.open_library_id;
  if (!bookId) {
    // This case should ideally not happen if data is processed correctly
    return <div className="p-2 border rounded text-xs text-destructive">Book data incomplete</div>;
  }
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <Link href={`/books/${bookId}`} className="block group">
        <CardHeader className="p-0">
          <div className="aspect-[2/3] w-full relative bg-muted flex items-center justify-center rounded-lg overflow-hidden">
            {book.coverImageUrl ? (
              <Image
                src={book.coverImageUrl}
                alt={`Cover of ${book.title}`}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 group-hover:scale-105 rounded-lg"
              />
            ) : (
              <BookOpen className="w-1/2 h-1/2 text-muted-foreground/50" />
            )}
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-4 flex-grow">
        <Link href={`/books/${bookId}`} className="block">
          <CardTitle className="text-lg font-headline leading-tight mb-1 hover:text-primary transition-colors line-clamp-2" title={book.title}>
            {book.title}
          </CardTitle>
        </Link>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-1" title={book.author}>by {book.author || 'Unknown Author'}</p>
        {typeof book.averageRating === 'number' && book.averageRating > 0 && (
          <div className="flex items-center">
            <StarRating initialRating={book.averageRating} readonly size={16} />
            <span className="ml-2 text-xs text-muted-foreground">({book.averageRating.toFixed(1)})</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Link href={`/books/${bookId}`} className="w-full">
          <Button variant="outline" className="w-full transition-colors duration-200">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

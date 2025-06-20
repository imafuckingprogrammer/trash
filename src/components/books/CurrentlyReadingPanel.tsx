"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentlyReadingBooks, removeFromCurrentlyReading } from '@/lib/services/bookService';
import type { Book } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

interface CurrentlyReadingPanelProps {
  onBookRemoved?: () => void;
}

export function CurrentlyReadingPanel({ onBookRemoved }: CurrentlyReadingPanelProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentlyReading();
  }, []);

  const loadCurrentlyReading = async () => {
    try {
      setLoading(true);
      const currentlyReading = await getCurrentlyReadingBooks(10);
      setBooks(currentlyReading);
    } catch (error) {
      console.error('Failed to load currently reading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCurrentlyReading = async (bookId: string) => {
    try {
      await removeFromCurrentlyReading(bookId);
      setBooks(prev => prev.filter(book => (book.id || book.google_book_id) !== bookId));
      onBookRemoved?.();
      toast({
        title: "Removed from Currently Reading",
        description: "Book has been removed from your currently reading list.",
      });
    } catch (error) {
      console.error('Failed to remove book from currently reading:', error);
      toast({
        title: "Error",
        description: "Failed to remove book. Please try again.",
        variant: "destructive",
      });
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, books.length - 3));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, books.length - 3)) % Math.max(1, books.length - 3));
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Currently Reading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (books.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Currently Reading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No books currently reading</p>
            <Link href="/discover" className="text-sm text-primary hover:underline">
              Discover books to start reading
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleBooks = books.slice(currentIndex, currentIndex + 4);
  const canNavigate = books.length > 4;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Currently Reading ({books.length})
          </CardTitle>
          {canNavigate && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextSlide}
                disabled={currentIndex >= books.length - 4}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-hidden">
          {visibleBooks.map((book) => {
            const bookId = book.id || book.google_book_id || '';
            return (
              <div key={bookId} className="flex-shrink-0 group">
                <div className="relative">
                  <Link href={`/books/${bookId}`}>
                    <div className="w-16 h-24 relative rounded shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      {book.coverImageUrl ? (
                        <Image
                          src={book.coverImageUrl}
                          alt={book.title}
                          fill
                          className="object-cover rounded"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveFromCurrentlyReading(bookId)}
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from currently reading"
                  >
                    ×
                  </Button>
                </div>
                <div className="mt-1 w-16">
                  <p className="text-xs text-center truncate font-medium" title={book.title}>
                    {book.title}
                  </p>
                  <p className="text-xs text-center truncate text-muted-foreground" title={book.author}>
                    {book.author}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 
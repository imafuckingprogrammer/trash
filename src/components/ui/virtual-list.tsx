import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize: number;
  className?: string;
  containerClassName?: string;
  getItemKey?: (item: T, index: number) => string | number;
  overscan?: number;
  horizontal?: boolean;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize,
  className = '',
  containerClassName = '',
  getItemKey,
  overscan = 5,
  horizontal = false,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    horizontal,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{
        height: horizontal ? 'auto' : '400px',
        width: horizontal ? '100%' : 'auto',
      }}
    >
      <div
        style={{
          height: horizontal ? 'auto' : virtualizer.getTotalSize(),
          width: horizontal ? virtualizer.getTotalSize() : '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index];
          const key = getItemKey ? getItemKey(item, virtualRow.index) : virtualRow.index;
          
          return (
            <div
              key={key}
              className={className}
              style={{
                position: 'absolute',
                top: horizontal ? 0 : virtualRow.start,
                left: horizontal ? virtualRow.start : 0,
                height: horizontal ? '100%' : virtualRow.size,
                width: horizontal ? virtualRow.size : '100%',
                transform: horizontal 
                  ? `translateX(${virtualRow.start}px)` 
                  : `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Specialized virtual list for books
interface VirtualBookListProps {
  books: any[];
  renderBook: (book: any, index: number) => React.ReactNode;
  className?: string;
  containerClassName?: string;
  height?: number;
}

export const VirtualBookList = React.memo<VirtualBookListProps>(({
  books,
  renderBook,
  className = '',
  containerClassName = '',
  height = 400,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: books.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350, // Estimated height for book cards
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (books.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No books found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const book = books[virtualRow.index];
          
          return (
            <div
              key={book.id || book.google_book_id || virtualRow.index}
              className={className}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderBook(book, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualBookList.displayName = 'VirtualBookList';

// Specialized virtual list for reviews
interface VirtualReviewListProps {
  reviews: any[];
  renderReview: (review: any, index: number) => React.ReactNode;
  className?: string;
  containerClassName?: string;
  height?: number;
}

export const VirtualReviewList = React.memo<VirtualReviewListProps>(({
  reviews,
  renderReview,
  className = '',
  containerClassName = '',
  height = 500,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: reviews.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Estimated height for review cards
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No reviews found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const review = reviews[virtualRow.index];
          
          return (
            <div
              key={review.id || virtualRow.index}
              className={className}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderReview(review, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualReviewList.displayName = 'VirtualReviewList';

// Grid virtual list for book grids
interface VirtualBookGridProps {
  books: any[];
  renderBook: (book: any, index: number) => React.ReactNode;
  columns?: number;
  itemHeight?: number;
  gap?: number;
  className?: string;
  containerClassName?: string;
  height?: number;
}

export const VirtualBookGrid = React.memo<VirtualBookGridProps>(({
  books,
  renderBook,
  columns = 3,
  itemHeight = 400,
  gap = 16,
  className = '',
  containerClassName = '',
  height = 600,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowCount = Math.ceil(books.length / columns);
  const rowHeight = itemHeight + gap;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 2,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (books.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No books found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const endIndex = Math.min(startIndex + columns, books.length);
          const rowBooks = books.slice(startIndex, endIndex);
          
          return (
            <div
              key={virtualRow.index}
              className={`grid gap-${gap / 4} ${className}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
              }}
            >
              {rowBooks.map((book, columnIndex) => {
                const bookIndex = startIndex + columnIndex;
                return (
                  <div key={book.id || book.google_book_id || bookIndex}>
                    {renderBook(book, bookIndex)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualBookGrid.displayName = 'VirtualBookGrid'; 
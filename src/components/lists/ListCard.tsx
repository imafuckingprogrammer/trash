import type { ListCollection } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, BookOpenCheck, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ListCardProps {
  list: ListCollection;
}

export function ListCard({ list }: ListCardProps) {
  const timeAgo = list.updated_at ? formatDistanceToNow(new Date(list.updated_at), { addSuffix: true }) : 'unknown';
  // Use pre-fetched cover_images if available, otherwise derive from books (if any)
  const coverImages = list.cover_images || list.books?.slice(0, 4).map(book => book.coverImageUrl || '') || [];

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <Link href={`/lists/${list.id}`} className="block group">
        <CardHeader className="p-4">
          <CardTitle className="text-xl font-headline leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2" title={list.name}>
            {list.name}
          </CardTitle>
          {list.user && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={list.user.avatar_url || `https://placehold.co/40x40.png`} alt={list.user.username} />
                <AvatarFallback>{list.user.username?.substring(0,1)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span>By {list.user.username}</span>
              <span>&bull;</span>
              <span>Updated {timeAgo}</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {list.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span>{list.is_public ? 'Public' : 'Private'}</span>
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-4 flex-grow">
        {list.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{list.description}</p>
        )}
        {coverImages.length > 0 ? (
          <div className="relative h-36 mb-2 flex items-center justify-center">
            {coverImages.slice(0, 4).map((src, index) => {
              const totalBooks = Math.min(coverImages.length, 4);
              const isCenter = totalBooks === 1 || (totalBooks === 3 && index === 1) || (totalBooks === 2 && index === 0) || (totalBooks === 4 && (index === 1 || index === 2));
              const zIndex = isCenter ? 30 : 20 - Math.abs(index - (totalBooks - 1) / 2) * 5;
              
              // Calculate position offset for overlapping effect - improved spacing
              let leftOffset = 0;
              if (totalBooks === 2) {
                leftOffset = index === 0 ? -14 : 14;
              } else if (totalBooks === 3) {
                leftOffset = (index - 1) * 18;
              } else if (totalBooks === 4) {
                leftOffset = (index - 1.5) * 16;
              }
              
              // Make back books more visible with better opacity and scale
              const isBackBook = !isCenter;
              const opacity = isBackBook ? 0.9 : 1;
              const scale = isBackBook ? 0.9 : 1;
              
              return (
                <div 
                  key={index} 
                  className={`absolute w-24 h-32 bg-muted rounded-lg overflow-hidden shadow-lg transition-all duration-200 group-hover:scale-105 ${isCenter ? 'shadow-2xl' : 'shadow-xl'}`}
                  style={{ 
                    zIndex, 
                    left: `calc(50% + ${leftOffset}px)`,
                    transform: `translateX(-50%) scale(${scale})`,
                    opacity,
                  }}
                >
                  {src ? (
                    <Image 
                      src={src} 
                      alt={`Book cover ${index + 1}`} 
                      fill
                      className="object-cover rounded-lg"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/60 flex items-center justify-center rounded-lg">
                      <BookOpenCheck className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                  )}
                  {/* Enhanced border for better definition */}
                  <div className="absolute inset-0 ring-1 ring-black/15 dark:ring-white/15 rounded-lg pointer-events-none" />
                  {/* Add subtle gradient overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-lg pointer-events-none" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 mb-2 flex items-center justify-center bg-muted/30 rounded-md">
            <BookOpenCheck className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t flex justify-between items-center">
        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
          <span className="flex items-center">
            <BookOpenCheck className="h-4 w-4 mr-1" /> {list.item_count || 0} {list.item_count === 1 ? "book" : "books"}
          </span>
          <span className={`flex items-center ${list.current_user_has_liked ? 'text-primary font-medium': ''}`}>
            <ThumbsUp className={`h-4 w-4 mr-1 ${list.current_user_has_liked ? 'fill-current' : ''}`} /> {list.like_count || 0}
          </span>
           {/* You might need to fetch comment count separately or include it in list data */}
           {/* <span className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" /> {list.comments?.length || 0} 
          </span> */}
        </div>
        <Link href={`/lists/${list.id}`}>
          <Button variant="outline" size="sm" className="transition-colors duration-200">View List</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

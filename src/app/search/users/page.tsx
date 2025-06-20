"use client";

import { useState } from 'react';
import type { UserProfile, PaginatedResponse } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2, User, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { searchUsers } from '@/lib/services/userService';
import Link from 'next/link';

export default function UserSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>, page: number = 1, loadMore: boolean = false) => {
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    
    if (!loadMore) {
      setCurrentPage(page);
      setSearchResults([]);
    }

    try {
      const response: PaginatedResponse<UserProfile> = await searchUsers(searchQuery, page, 100);
      
      if (loadMore) {
        setSearchResults(prev => [...prev, ...response.items]);
        setCurrentPage(page);
      } else {
        setSearchResults(response.items);
      }
      
      setHasMore(page < response.totalPages);
      
      if (response.items.length === 0 && searchQuery) {
        setError("No users found matching your search.");
      } else if (response.items.length === 0) {
        setError(null);
      }
    } catch (err) {
      console.error("User search failed:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to search users: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreUsers = () => {
    if (hasMore && !isLoading) {
      handleSearch(undefined, currentPage + 1, true);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 font-headline text-primary flex items-center gap-3">
          <Users className="h-8 w-8" />
          Find Users
        </h1>
        
        <form onSubmit={(e) => handleSearch(e, 1)} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search users by username or name..." 
                className="pl-10 w-full" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading && currentPage === 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Search Users
            </Button>
          </div>
        </form>
      </section>

      {error && !isLoading && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Search Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section>
        {isLoading && searchResults.length === 0 && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Searching for users...</p>
          </div>
        )}
        
        {!isLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || `https://placehold.co/48x48.png`} alt={user.username} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {user.name || user.username}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {user.bio}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {user.follower_count || 0} followers
                    </span>
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {user.following_count || 0} following
                    </span>
                  </div>
                  <Link href={`/profile/${user.username}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {!isLoading && searchResults.length === 0 && searchQuery && !error && (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No users found matching your search. Try a different term.</p>
          </div>
        )}
        
        {!isLoading && searchResults.length === 0 && !searchQuery && !error && (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Enter a search term to find users.</p>
          </div>
        )}
        
        {hasMore && searchResults.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button 
              onClick={loadMoreUsers}
              disabled={isLoading}
              variant="outline"
              size="lg"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Load More Users
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}


"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/lists/ListCard';
import type { ListCollection, PaginatedResponse } from '@/types';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserLists } from '@/lib/services/userService'; // Assuming this fetches lists for the logged-in user

export default function ListsPage() {
  const { userProfile, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [lists, setLists] = useState<ListCollection[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add pagination state if needed:
  // const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!authIsLoading && isAuthenticated && userProfile) {
      setIsLoadingLists(true);
      setError(null);
      getUserLists(userProfile.id) // Fetch lists for the current authenticated user
        .then((data: PaginatedResponse<ListCollection>) => {
          setLists(data.items);
          // setTotalPages(data.totalPages);
        })
        .catch(err => {
          console.error("Failed to fetch user lists:", err);
          setError("Could not load your lists. Please try again.");
        })
        .finally(() => setIsLoadingLists(false));
    } else if (!authIsLoading && !isAuthenticated) {
      // Handle case where user is not authenticated (e.g., redirect or show message)
      setIsLoadingLists(false);
      setLists([]); // Clear lists if user logs out
    }
  }, [userProfile, isAuthenticated, authIsLoading]);

  if (authIsLoading || isLoadingLists) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12 bg-card rounded-lg shadow-sm">
        <p className="text-xl text-muted-foreground mb-4">Please <Link href="/login" className="text-primary hover:underline">log in</Link> to view your lists.</p>
      </div>
    );
  }
  
  if (error) {
     return <div className="text-center py-10 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <section className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline text-primary">My Book Lists</h1>
        <Link href="/lists/new">
          <Button className="transition-transform hover:scale-105">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New List
          </Button>
        </Link>
      </section>

      {lists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm">
          <p className="text-xl text-muted-foreground mb-4">You haven't created any lists yet.</p>
          <Link href="/lists/new">
            <Button size="lg" className="transition-transform hover:scale-105">
              Create Your First List
            </Button>
          </Link>
        </div>
      )}
      {/* Add pagination controls here if implementing pagination */}
    </div>
  );
}

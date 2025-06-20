
"use client";
import { useState, type FormEvent } from 'react';
import type { ListCollection, PaginatedResponse } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ListChecks, ListFilter } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { searchLists } from '@/lib/services/listService';
import { ListCard } from '@/components/lists/ListCard'; // Assuming ListCard is suitable
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Example filters, adapt as needed
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "likes", label: "Most Liked" },
  { value: "items", label: "Most Items" },
];

export default function SearchListsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ListCollection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filter state examples
  const [sortBy, setSortBy] = useState("relevance");
  // const [filterPublicOnly, setFilterPublicOnly] = useState(true);

  const handleSearch = async (e?: FormEvent, page: number = 1) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please enter a search term for lists.");
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPage(page);

    const filters = {
      sortBy,
      // isPublic: filterPublicOnly,
      // Add more filters as needed: minItems, createdByUserId, etc.
    };

    try {
      const response: PaginatedResponse<ListCollection> = await searchLists(searchQuery, page, 20, filters);
      setSearchResults(response.items);
      setTotalPages(response.totalPages);
      if (response.items.length === 0) {
        setError("No lists found matching your criteria.");
      }
    } catch (err) {
      console.error("List search failed:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to search lists: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4 font-headline text-primary flex items-center"><ListChecks className="mr-3 h-8 w-8" /> Find Book Lists</h1>
        <form onSubmit={(e) => handleSearch(e, 1)} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search by list name, description, or creator..." 
                className="pl-10 w-full" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="md:w-auto w-full">
              {isLoading && currentPage === 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Search Lists
            </Button>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-sm">
                  <ListFilter className="mr-2 h-4 w-4" /> Sort by: {sortOptions.find(opt => opt.value === sortBy)?.label || "Relevance"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map(option => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={sortBy === option.value}
                    onCheckedChange={() => {setSortBy(option.value); if(searchQuery.trim()) handleSearch(undefined, 1);}}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Add more filter dropdowns here, e.g., for public/private, number of items, etc. */}
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
            <p className="ml-4 text-lg">Searching for lists...</p>
          </div>
        )}
        {!isLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}
        {!isLoading && searchResults.length === 0 && searchQuery && !error && (
           <div className="text-center py-10 text-muted-foreground">
            <p>No lists found for "{searchQuery}" with the current filters. Try different criteria.</p>
          </div>
        )}
         {!isLoading && searchResults.length === 0 && !searchQuery && !error && (
           <div className="text-center py-10 text-muted-foreground">
            <p>Enter a search term above to find book lists.</p>
          </div>
        )}
      </section>

      {!isLoading && searchResults.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button 
            variant="outline" 
            onClick={() => handleSearch(undefined, currentPage - 1)} 
            disabled={currentPage <= 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button 
            variant="outline" 
            onClick={() => handleSearch(undefined, currentPage + 1)} 
            disabled={currentPage >= totalPages || isLoading}
          >
            {isLoading && currentPage < totalPages ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Next
          </Button>
        </div>
      )}
    </div>
  );
}


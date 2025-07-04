"use client";

import { useState, type FormEvent } from 'react';
import type { Book, ListCollection, PaginatedResponse } from '@/types';
import { BookCard } from '@/components/books/BookCard';
import { ListCard } from '@/components/lists/ListCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Loader2, BookOpen, List } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { searchBooks, markAsCurrentlyReading, removeFromCurrentlyReading } from '@/lib/services/bookService';
import { searchLists } from '@/lib/services/listService';
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Comprehensive filters for book search
const genres = [
  "Fiction", "Science Fiction", "Fantasy", "Mystery", "Thriller", "Romance", "Horror",
  "Non-Fiction", "History", "Biography", "Autobiography", "Self-Help", "Business",
  "Psychology", "Philosophy", "Religion", "Science", "Technology", "Health",
  "Travel", "Cooking", "Art", "Music", "Sports", "Politics", "Economics",
  "Education", "Parenting", "True Crime", "Adventure", "Literary Fiction",
  "Young Adult", "Children's Books", "Poetry", "Drama", "Essays", "Humor"
];

const publicationYears = [
  "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015",
  "2010s", "2000s", "1990s", "1980s", "1970s", "1960s", "1950s", "Older"
];

const ratingFilters = [
  { value: "", label: "Any Rating" },
  { value: "4", label: "4+ Stars" },
  { value: "3", label: "3+ Stars" },
  { value: "2", label: "2+ Stars" },
  { value: "1", label: "1+ Stars" }
];

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "title", label: "Title A-Z" },
  { value: "author", label: "Author A-Z" },
  { value: "popular", label: "Most Popular" }
];

export default function DiscoverPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('books');
  
  // Books state
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([]);
  const [bookIsLoading, setBookIsLoading] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookCurrentPage, setBookCurrentPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(0);
  const [bookHasMore, setBookHasMore] = useState(false);

  // Lists state
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listSearchResults, setListSearchResults] = useState<ListCollection[]>([]);
  const [listIsLoading, setListIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [listTotalPages, setListTotalPages] = useState(0);
  const [listHasMore, setListHasMore] = useState(false);

  // Book filter states
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMinRating, setSelectedMinRating] = useState<string>("");
  const [selectedSortBy, setSelectedSortBy] = useState<string>("relevance");

  const handleBookSearch = async (e?: React.FormEvent<HTMLFormElement>, page: number = 1, loadMore: boolean = false) => {
    if (e) e.preventDefault();
    
    setBookIsLoading(true);
    setBookError(null);
    
    if (!loadMore) {
      setBookCurrentPage(page);
      setBookSearchResults([]);
    }

    const filters = {
      genres: selectedGenres.length > 0 ? selectedGenres.join(',') : '',
      publicationYear: selectedYear,
      minRating: selectedMinRating,
      sortBy: selectedSortBy,
    };
    // Remove empty filters
    Object.keys(filters).forEach(key => {
      if (!filters[key as keyof typeof filters]) {
        delete filters[key as keyof typeof filters];
      }
    });

    try {
      const response: PaginatedResponse<Book> = await searchBooks(bookSearchQuery, page, 20, filters);
      
      if (loadMore) {
        setBookSearchResults(prev => [...prev, ...response.items]);
        setBookCurrentPage(page);
      } else {
        setBookSearchResults(response.items);
      }
      
      setBookTotalPages(response.totalPages);
      setBookHasMore(page < response.totalPages);
      
      if (response.items.length === 0 && (bookSearchQuery || Object.keys(filters).length > 0)) {
        setBookError("No books found matching your criteria.");
      } else if (response.items.length === 0) {
        setBookError(null);
      }
    } catch (err) {
      console.error("Book search failed:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setBookError(`Failed to fetch books: ${message}`);
    } finally {
      setBookIsLoading(false);
    }
  };

  const handleListSearch = async (e?: React.FormEvent<HTMLFormElement>, page: number = 1, loadMore: boolean = false) => {
    if (e) e.preventDefault();
    
    setListIsLoading(true);
    setListError(null);
    
    if (!loadMore) {
      setListCurrentPage(page);
      setListSearchResults([]);
    }

    try {
      const response: PaginatedResponse<ListCollection> = await searchLists(listSearchQuery, page, 20);
      
      if (loadMore) {
        setListSearchResults(prev => [...prev, ...response.items]);
        setListCurrentPage(page);
      } else {
        setListSearchResults(response.items);
      }
      
      setListTotalPages(response.totalPages);
      setListHasMore(page < response.totalPages);
      
      if (response.items.length === 0 && listSearchQuery) {
        setListError("No lists found matching your criteria.");
      } else if (response.items.length === 0) {
        setListError(null);
      }
    } catch (err) {
      console.error("List search failed:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setListError(`Failed to fetch lists: ${message}`);
    } finally {
      setListIsLoading(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const loadMoreBooks = () => {
    if (bookHasMore && !bookIsLoading) {
      handleBookSearch(undefined, bookCurrentPage + 1, true);
    }
  };

  const loadMoreLists = () => {
    if (listHasMore && !listIsLoading) {
      handleListSearch(undefined, listCurrentPage + 1, true);
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
      
      // Update the book in the search results
      setBookSearchResults(prev => 
        prev.map(book => 
          (book.id || book.google_book_id) === bookId 
            ? { ...book, currentUserIsCurrentlyReading: isCurrentlyReading }
            : book
        )
      );
    } catch (error) {
      console.error('Failed to update currently reading status:', error);
      toast({
        title: "Error",
        description: "Failed to update reading status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 font-headline text-primary">Discover</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="books" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Books
            </TabsTrigger>
            <TabsTrigger value="lists" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="space-y-4">
            <form onSubmit={(e) => handleBookSearch(e, 1)} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search books by title, author, ISBN..." 
                    className="pl-10 w-full" 
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={bookIsLoading} className="w-full md:w-auto">
                  {bookIsLoading && bookCurrentPage === 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Search Books
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground mr-2">Filters:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4"/>Genre ({selectedGenres.length > 0 ? selectedGenres.length : 'Any'})</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Select Genres</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {genres.map(genre => (
                      <DropdownMenuCheckboxItem
                        key={genre}
                        checked={selectedGenres.includes(genre)}
                        onCheckedChange={() => toggleGenre(genre)}
                      >
                        {genre}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4"/>Year ({selectedYear || 'Any'})</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Publication Year</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={!selectedYear} onCheckedChange={() => setSelectedYear("")}>Any Year</DropdownMenuCheckboxItem>
                    {publicationYears.map(year => (
                      <DropdownMenuCheckboxItem
                        key={year}
                        checked={selectedYear === year}
                        onCheckedChange={() => setSelectedYear(selectedYear === year ? "" : year)}
                      >
                        {year}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4"/>Rating ({ratingFilters.find(r=>r.value === selectedMinRating)?.label || 'Any Rating'})</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Minimum Rating</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ratingFilters.map(rating => (
                      <DropdownMenuCheckboxItem
                        key={rating.value}
                        checked={selectedMinRating === rating.value}
                        onCheckedChange={() => setSelectedMinRating(selectedMinRating === rating.value ? "" : rating.value)}
                      >
                        {rating.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4"/>Sort By ({sortOptions.find(s=>s.value === selectedSortBy)?.label || 'Relevance'})</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sortOptions.map(opt => (
                      <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={selectedSortBy === opt.value}
                        onCheckedChange={() => setSelectedSortBy(opt.value)}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {(selectedGenres.length > 0 || selectedYear || selectedMinRating || selectedSortBy !== "relevance") && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedGenres([]);
                        setSelectedYear("");
                        setSelectedMinRating("");
                        setSelectedSortBy("relevance");
                        handleBookSearch(undefined, 1);
                    }}>Clear Filters</Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="lists" className="space-y-4">
            <form onSubmit={(e) => handleListSearch(e, 1)} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search lists by title or description..." 
                    className="pl-10 w-full" 
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={listIsLoading} className="w-full md:w-auto">
                  {listIsLoading && listCurrentPage === 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Search Lists
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </section>

      {/* Books Results */}
      {activeTab === 'books' && (
        <>
          {bookError && !bookIsLoading && (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{bookError}</AlertDescription>
            </Alert>
          )}

          <section>
            {bookIsLoading && bookSearchResults.length === 0 && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg">Searching for books...</p>
              </div>
            )}
            {!bookIsLoading && bookSearchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {bookSearchResults.map((book) => (
                  <BookCard 
                    key={book.id || book.google_book_id || book.open_library_id} 
                    book={book} 
                  />
                ))}
              </div>
            )}
            {!bookIsLoading && bookSearchResults.length === 0 && (bookSearchQuery || selectedGenres.length > 0 || selectedYear || selectedMinRating) && !bookError && (
               <div className="text-center py-10 text-muted-foreground">
                <p>No books found for your current search and filters. Try adjusting them.</p>
              </div>
            )}
             {!bookIsLoading && bookSearchResults.length === 0 && !bookSearchQuery && selectedGenres.length === 0 && !selectedYear && !selectedMinRating && !bookError && (
               <div className="text-center py-10 text-muted-foreground">
                <p>Enter a search term or apply filters to find books.</p>
              </div>
            )}
            
            {bookHasMore && bookSearchResults.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMoreBooks}
                  disabled={bookIsLoading}
                  variant="outline"
                  size="lg"
                >
                  {bookIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Load More Books
                </Button>
              </div>
            )}
          </section>
        </>
      )}

      {/* Lists Results */}
      {activeTab === 'lists' && (
        <>
          {listError && !listIsLoading && (
            <Alert variant="destructive" className="mt-6">
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          )}

          <section>
            {listIsLoading && listSearchResults.length === 0 && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg">Searching for lists...</p>
              </div>
            )}
            {!listIsLoading && listSearchResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listSearchResults.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
            )}
            {!listIsLoading && listSearchResults.length === 0 && listSearchQuery && !listError && (
               <div className="text-center py-10 text-muted-foreground">
                <p>No lists found matching your search. Try a different term.</p>
              </div>
            )}
             {!listIsLoading && listSearchResults.length === 0 && !listSearchQuery && !listError && (
               <div className="text-center py-10 text-muted-foreground">
                <p>Enter a search term to find lists.</p>
              </div>
            )}
            
            {listHasMore && listSearchResults.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={loadMoreLists}
                  disabled={listIsLoading}
                  variant="outline"
                  size="lg"
                >
                  {listIsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Load More Lists
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

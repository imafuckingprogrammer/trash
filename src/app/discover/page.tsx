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
import { searchBooks } from '@/lib/services/bookService';
import { searchLists } from '@/lib/services/listService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Example filters - these would map to backend query parameters
const genres = ["Fiction", "Science Fiction", "Fantasy", "Mystery", "Thriller", "Non-Fiction", "History", "Biography"];
const publicationYears = ["2024", "2023", "2020s", "2010s", "2000s", "1990s", "Older"];
const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Highest Rated" },
];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('books');
  
  // Books state
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [booksPage, setBooksPage] = useState(1);
  const [booksTotalPages, setBooksTotalPages] = useState(0);
  const [booksError, setBooksError] = useState<string | null>(null);
  
  // Lists state
  const [lists, setLists] = useState<ListCollection[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [listsPage, setListsPage] = useState(1);
  const [listsTotalPages, setListsTotalPages] = useState(0);
  const [listsError, setListsError] = useState<string | null>(null);

  // Filter states (for books)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSortBy, setSelectedSortBy] = useState<string>("relevance");

  const searchBooksData = async (page: number = 1, append = false) => {
    setIsLoadingBooks(true);
    setBooksError(null);
    setBooksPage(page);

    const filters = {
      genres: selectedGenres.join(','),
      publicationYear: selectedYear,
      sortBy: selectedSortBy,
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
      if (!filters[key as keyof typeof filters]) {
        delete filters[key as keyof typeof filters];
      }
    });

    try {
      const response: PaginatedResponse<Book> = await searchBooks(searchQuery, page, 20, filters);
      
      if (append) {
        setBooks(prev => [...prev, ...response.items]);
      } else {
        setBooks(response.items);
      }
      
      setBooksTotalPages(response.totalPages);
      
      if (response.items.length === 0 && (searchQuery || Object.keys(filters).length > 0)) {
        setBooksError("No books found matching your criteria.");
      }
    } catch (err) {
      console.error("Books search failed:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setBooksError(`Failed to fetch books: ${message}`);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const searchListsData = async (page: number = 1, append = false) => {
    if (!searchQuery.trim()) return;
    
    setIsLoadingLists(true);
    setListsError(null);
    setListsPage(page);

    try {
      const response: PaginatedResponse<ListCollection> = await searchLists(searchQuery, page, 20);
      
      if (append) {
        setLists(prev => [...prev, ...response.items]);
      } else {
        setLists(response.items);
      }
      
      setListsTotalPages(response.totalPages);
      
      if (response.items.length === 0) {
        setListsError("No lists found matching your search.");
      }
    } catch (err) {
      console.error("Lists search failed:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setListsError(`Failed to fetch lists: ${message}`);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    
    // Reset pagination
    setBooksPage(1);
    setListsPage(1);
    setBooks([]);
    setLists([]);
    
    if (activeTab === 'books') {
      searchBooksData(1);
    } else {
      searchListsData(1);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (searchQuery.trim()) {
      if (tab === 'books' && books.length === 0) {
        searchBooksData(1);
      } else if (tab === 'lists' && lists.length === 0) {
        searchListsData(1);
      }
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedYear("");
    setSelectedSortBy("relevance");
    if (searchQuery && activeTab === 'books') {
      searchBooksData(1);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4 font-headline text-primary">Discover</h1>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search books, lists, authors..." 
                className="pl-10 w-full" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={(isLoadingBooks && activeTab === 'books') || (isLoadingLists && activeTab === 'lists')} className="w-full md:w-auto">
              {((isLoadingBooks && activeTab === 'books') || (isLoadingLists && activeTab === 'lists')) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Search
            </Button>
          </div>
        </form>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="books" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Books
          </TabsTrigger>
          <TabsTrigger value="lists" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-6">
          {/* Book Filters */}
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
            
            {(selectedGenres.length > 0 || selectedYear || selectedSortBy !== "relevance") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>

          {/* Books Results */}
          {booksError && !isLoadingBooks && (
            <Alert variant="destructive">
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{booksError}</AlertDescription>
            </Alert>
          )}

          {isLoadingBooks && books.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : books.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {books.map((book) => (
                  <BookCard key={book.id || book.google_book_id || book.open_library_id} book={book} />
                ))}
              </div>
              
              {booksPage < booksTotalPages && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => searchBooksData(booksPage + 1, true)}
                    disabled={isLoadingBooks}
                    variant="outline"
                  >
                    {isLoadingBooks ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Books'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : searchQuery && !isLoadingBooks ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No books found for "{searchQuery}"</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="lists" className="space-y-6">
          {/* Lists Results */}
          {listsError && !isLoadingLists && (
            <Alert variant="destructive">
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{listsError}</AlertDescription>
            </Alert>
          )}

          {isLoadingLists && lists.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : lists.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lists.map((list) => (
                  <ListCard key={list.id} list={list} />
                ))}
              </div>
              
              {listsPage < listsTotalPages && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => searchListsData(listsPage + 1, true)}
                    disabled={isLoadingLists}
                    variant="outline"
                  >
                    {isLoadingLists ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Lists'
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : searchQuery && !isLoadingLists ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No lists found for "{searchQuery}"</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {!searchQuery && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Enter a search term to discover books and lists</p>
        </div>
      )}
    </div>
  );
}

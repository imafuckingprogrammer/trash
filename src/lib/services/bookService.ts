import type { Book, PaginatedResponse, Review, UserBookInteraction } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';

const API_BASE_URL = '/api'; // Adjust if your API routes are different

/**
 * Searches for books from Google Books API and caches results in database
 */
export async function searchBooks(query: string, page: number = 1, pageSize: number = 20, filters?: Record<string,any>): Promise<PaginatedResponse<Book>> {
  try {
    // First try to search cached books in database
    const offset = (page - 1) * pageSize;
    let dbQuery = supabase
      .from('books')
      .select('*', { count: 'exact' })
      .order('title');

    // Apply search filters
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,authors.cs.{${query.split(' ').join(',')}}`);
    }
    
    if (filters?.genre && filters.genre !== 'all') {
      dbQuery = dbQuery.contains('genres', [filters.genre]);
    }
    
    if (filters?.year) {
      dbQuery = dbQuery.eq('publication_year', filters.year);
    }
    
    if (filters?.minRating) {
      dbQuery = dbQuery.gte('average_rating', filters.minRating);
    }

    const { data: cachedBooks, error: dbError, count } = await dbQuery
      .range(offset, offset + pageSize - 1);

    if (dbError) throw dbError;

    // If we have enough cached results, return them
    if (cachedBooks && cachedBooks.length >= pageSize) {
      const currentUserId = await getCurrentUserId();
      const booksWithUserData = await enrichBooksWithUserData(cachedBooks, currentUserId);
      
      return {
        items: booksWithUserData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    }

    // Otherwise, search Google Books API
    const response = await fetch(`/api/search/books?q=${encodeURIComponent(query)}&page=${page}&maxResults=${pageSize}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    const googleBooks: Book[] = await response.json();
    
    // Cache new books in database
    if (googleBooks.length > 0) {
      await cacheGoogleBooks(googleBooks);
    }

    // Add user interaction data
    const currentUserId = await getCurrentUserId();
    const booksWithUserData = await enrichBooksWithUserData(googleBooks, currentUserId);
    
    return {
      items: booksWithUserData,
      total: booksWithUserData.length > 0 ? booksWithUserData.length * (page + 1) : 0,
      page,
      pageSize,
      totalPages: booksWithUserData.length > 0 ? page + 1 : page,
    };
  } catch (error) {
    console.error('Failed to search books:', error);
    throw error;
  }
}

async function cacheGoogleBooks(books: Book[]) {
  try {
    const booksToInsert = books.map(book => ({
      google_book_id: book.google_book_id,
      title: book.title,
      authors: book.author ? book.author.split(', ') : ['Unknown Author'],
      cover_image_url: book.coverImageUrl,
      summary: book.summary,
      publication_year: book.publicationYear,
      isbn13: book.isbn,
      genres: book.genres || [],
    }));

    const { error } = await supabase
      .from('books')
      .upsert(booksToInsert, { 
        onConflict: 'google_book_id',
        ignoreDuplicates: true 
      });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Failed to cache books:', error);
    }
  } catch (error) {
    console.error('Failed to cache Google Books:', error);
  }
}

async function enrichBooksWithUserData(books: any[], userId?: string): Promise<Book[]> {
  if (books.length === 0) return [];

  try {
    const bookIds = books.map(book => book.id).filter(Boolean);
    let interactionMap = new Map();
    
    if (userId && bookIds.length > 0) {
      const { data: interactions } = await supabase
        .from('user_book_interactions')
        .select('*')
        .eq('user_id', userId)
        .in('book_id', bookIds);

      interactions?.forEach(interaction => {
        interactionMap.set(interaction.book_id, interaction);
      });
    }

    return books.map(book => {
      const interaction = interactionMap.get(book.id);
      
      // Convert database format to frontend format
      const processedBook: Book = {
        ...book,
        // Fix authors array to string conversion
        author: Array.isArray(book.authors) && book.authors.length > 0 
          ? book.authors.join(', ') 
          : book.author || 'Unknown Author',
        // Fix cover image URL mapping
        coverImageUrl: book.cover_image_url || book.coverImageUrl,
        // Fix rating mapping
        averageRating: book.average_rating || book.averageRating,
        // User interaction data
        currentUserRating: interaction?.rating,
        currentUserIsRead: interaction?.is_read || false,
        currentUserIsCurrentlyReading: interaction?.is_currently_reading || false,
        currentUserReadDate: interaction?.read_date,
        currentUserIsOnWatchlist: interaction?.is_on_watchlist || false,
        currentUserIsLiked: interaction?.is_liked || false,
        currentUserIsOwned: interaction?.is_owned || false,
      };
      
      return processedBook;
    });
  } catch (error) {
    console.error('Failed to enrich books with user data:', error);
    return books.map(book => ({
      ...book,
      author: Array.isArray(book.authors) && book.authors.length > 0 
        ? book.authors.join(', ') 
        : book.author || 'Unknown Author',
      coverImageUrl: book.cover_image_url || book.coverImageUrl,
      averageRating: book.average_rating || book.averageRating,
    }));
  }
}

export async function getBookDetails(bookId: string): Promise<Book | null> {
  try {
    const currentUserId = await getCurrentUserId();
    
    // Try to get from database first
    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (book) {
      const [bookWithUserData] = await enrichBooksWithUserData([book], currentUserId);
      return bookWithUserData;
    }

    // If not in database and bookId looks like a Google Books ID, try to fetch from Google Books
    if (bookId.includes('_') || bookId.length > 20) {
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
        if (response.ok) {
          const googleBook = await response.json();
          const book = convertGoogleBookToBook(googleBook);
          await cacheGoogleBooks([book]);
          const [bookWithUserData] = await enrichBooksWithUserData([book], currentUserId);
          return bookWithUserData;
        }
      } catch (error) {
        console.error('Failed to fetch from Google Books:', error);
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get book details:', error);
    throw error;
  }
}

function convertGoogleBookToBook(googleBook: any): Book {
  const volumeInfo = googleBook.volumeInfo || {};
  return {
    id: googleBook.id,
    google_book_id: googleBook.id,
    title: volumeInfo.title || 'Unknown Title',
    author: volumeInfo.authors && volumeInfo.authors.length > 0 
      ? volumeInfo.authors.join(', ') 
      : 'Unknown Author',
    coverImageUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail,
    summary: volumeInfo.description,
    publicationYear: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.split('-')[0]) : undefined,
    isbn: volumeInfo.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier,
    genres: volumeInfo.categories || [],
    };
}

export async function getBookReviews(bookId: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Review>> {
  try {
    const offset = (page - 1) * pageSize;
    const currentUserId = await getCurrentUserId();
    
    const { data, error, count } = await supabase
      .from('reviews')
      .select(`
        *,
        user:user_profiles(*),
        book:books(*),
        current_user_has_liked:likes!left(user_id)
      `, { count: 'exact' })
      .eq('book_id', bookId)
      .eq('likes.user_id', currentUserId || '')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const reviews = data?.map((review: any) => ({
      ...review,
      current_user_has_liked: review.current_user_has_liked?.length > 0 || false,
    })) || [];

    return {
      items: reviews,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Failed to get book reviews:', error);
    throw error;
  }
}

export async function addBookReview(bookId: string, rating: number, reviewText?: string): Promise<Review> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    // First ensure the book exists in our database
    await ensureBookExists(bookId);

    // Step 1: Insert/update the review without joins to avoid ambiguity
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .upsert({
        user_id: currentUserId,
    book_id: bookId,
    rating,
    review_text: reviewText,
      }, {
        onConflict: 'user_id,book_id'
      })
      .select('*')
      .single();

    if (reviewError) throw reviewError;

    // Step 2: Fetch user and book data separately to avoid join ambiguity
    const [userResult, bookResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUserId)
        .single(),
      supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single()
    ]);

    if (userResult.error) throw userResult.error;
    if (bookResult.error) throw bookResult.error;

    // Step 3: Combine the data
    const review: Review = {
      ...reviewData,
      user: userResult.data,
      book: bookResult.data,
    };

    // Also update user book interaction
    await updateUserBookInteraction(bookId, { 
      rating,
      is_read: true,
      read_date: new Date().toISOString().split('T')[0]
    });

    return review;
  } catch (error) {
    console.error('Failed to add book review:', error);
    throw error;
  }
}

async function ensureBookExists(bookId: string) {
  const { data } = await supabase
    .from('books')
    .select('id')
    .eq('id', bookId)
    .single();

  if (!data) {
    // Try to fetch from Google Books and cache
    if (bookId.includes('_') || bookId.length > 20) {
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
        if (response.ok) {
          const googleBook = await response.json();
          const book = convertGoogleBookToBook(googleBook);
          await cacheGoogleBooks([book]);
        }
      } catch (error) {
        console.error('Failed to ensure book exists:', error);
      }
    }
  }
}

export async function updateUserBookInteraction(bookId: string, interaction: Partial<Omit<UserBookInteraction, 'user_id' | 'book_id' | 'created_at' | 'updated_at'>>): Promise<UserBookInteraction> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) throw new Error('Not authenticated');

    await ensureBookExists(bookId);

    const { data, error } = await supabase
      .from('user_book_interactions')
      .upsert({
        user_id: currentUserId,
    book_id: bookId,
    ...interaction,
      }, {
        onConflict: 'user_id,book_id'
      })
      .select(`
        *,
        book:books(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update book interaction:', error);
    throw error;
  }
}

export async function getUserBookInteraction(bookId: string): Promise<UserBookInteraction | null> {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return null;

    const { data, error } = await supabase
      .from('user_book_interactions')
      .select(`
        *,
        book:books(*)
      `)
      .eq('user_id', currentUserId)
      .eq('book_id', bookId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get book interaction:', error);
    throw error;
  }
}

export async function likeBook(bookId: string): Promise<void> {
  try {
    await updateUserBookInteraction(bookId, { is_liked: true });
  } catch (error) {
    console.error('Failed to like book:', error);
    throw error;
  }
}

export async function unlikeBook(bookId: string): Promise<void> {
  try {
    await updateUserBookInteraction(bookId, { is_liked: false });
  } catch (error) {
    console.error('Failed to unlike book:', error);
    throw error;
  }
}

export async function markAsCurrentlyReading(bookId: string): Promise<void> {
  try {
    await updateUserBookInteraction(bookId, { 
      is_currently_reading: true,
      is_on_watchlist: false // Remove from watchlist when starting to read
    });
  } catch (error) {
    console.error('Failed to mark book as currently reading:', error);
    throw error;
  }
}

export async function removeFromCurrentlyReading(bookId: string): Promise<void> {
  try {
    await updateUserBookInteraction(bookId, { is_currently_reading: false });
  } catch (error) {
    console.error('Failed to remove book from currently reading:', error);
    throw error;
  }
}

export async function addToWatchlist(bookId: string): Promise<void> {
  try {
    await updateUserBookInteraction(bookId, { 
      is_on_watchlist: true,
      is_currently_reading: false // Remove from currently reading when adding to watchlist
    });
  } catch (error) {
    console.error('Failed to add book to watchlist:', error);
    throw error;
  }
}

export async function removeFromWatchlist(bookId: string): Promise<void> {
  try {
    await updateUserBookInteraction(bookId, { is_on_watchlist: false });
  } catch (error) {
    console.error('Failed to remove book from watchlist:', error);
    throw error;
  }
}

export async function getPopularBooks(limit: number = 5): Promise<Book[]> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('average_rating', { ascending: false })
      .order('total_ratings', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return await enrichBooksWithUserData(data || [], currentUserId);
  } catch (error) {
    console.error('Failed to get popular books:', error);
    return [];
  }
}

export async function getRecentlyReviewedBooks(limit: number = 4): Promise<Book[]> {
  try {
    const currentUserId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        book:books(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const books = data?.map((item: any) => item.book).filter(Boolean) || [];
    return await enrichBooksWithUserData(books, currentUserId);
  } catch (error) {
    console.error('Failed to get recently reviewed books:', error);
    return [];
  }
}

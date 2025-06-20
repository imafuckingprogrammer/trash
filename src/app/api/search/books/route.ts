import type { Book } from '@/types';
import { NextResponse, type NextRequest } from 'next/server';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
// const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'; // Example for Open Library

// Get API key from environment
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// Helper function to transform Google Books API item to our Book type
function formatGoogleBook(item: any): Book {
  const volumeInfo = item.volumeInfo || {};
  const imageLinks = volumeInfo.imageLinks || {};
  
  let publicationYear;
  if (volumeInfo.publishedDate) {
    const yearMatch = volumeInfo.publishedDate.match(/\d{4}/);
    if (yearMatch) {
      publicationYear = parseInt(yearMatch[0], 10);
    }
  }

  let isbn;
  if (volumeInfo.industryIdentifiers) {
    const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
    if (isbn13) {
      isbn = isbn13.identifier;
    } else {
      const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
      if (isbn10) {
        isbn = isbn10.identifier;
      }
    }
  }

  return {
    id: item.id,
    google_book_id: item.id,
    title: volumeInfo.title || 'No title',
    author: volumeInfo.authors && volumeInfo.authors.length > 0 ? volumeInfo.authors.join(', ') : 'Unknown Author',
    coverImageUrl: imageLinks.large || imageLinks.medium || imageLinks.small || imageLinks.thumbnail?.replace('http:', 'https:') || imageLinks.smallThumbnail?.replace('http:', 'https:') || undefined,
    summary: volumeInfo.description || 'No summary available.',
    averageRating: volumeInfo.averageRating,
    genres: volumeInfo.categories || [],
    publicationYear,
    isbn,
  };
}

// Example Helper for Open Library (needs to be adapted based on actual response structure)
// function formatOpenLibraryBook(doc: any): Partial<Book> {
//   return {
//     open_library_id: doc.key?.replace('/works/', ''),
//     title: doc.title || 'No title',
//     author: doc.author_name ? doc.author_name.join(', ') : 'Unknown author',
//     publicationYear: doc.first_publish_year,
//     isbn: doc.isbn ? doc.isbn[0] : undefined, // OL provides an array
//     // coverImageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined,
//   };
// }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const pageParam = searchParams.get('page') || '1';
  const maxResultsParam = searchParams.get('maxResults') || '20';

  const page = parseInt(pageParam, 10);
  const maxResults = parseInt(maxResultsParam, 10);
  const startIndex = (page - 1) * maxResults;

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    // Build Google Books API URL
    let googleBooksUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&startIndex=${startIndex}&maxResults=${maxResults}`;
    
    // Only add API key if it exists and is not empty
    if (GOOGLE_API_KEY && GOOGLE_API_KEY.trim() !== '') {
      googleBooksUrl += `&key=${GOOGLE_API_KEY}`;
    }

    console.log('Calling Google Books API:', googleBooksUrl.replace(GOOGLE_API_KEY || '', '[API_KEY]'));

    const googleResponse = await fetch(googleBooksUrl);
    
    if (!googleResponse.ok) {
      const errorData = await googleResponse.text();
      console.error('Google Books API error:', errorData);
      
      // Parse error if it's JSON
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorData);
      } catch {
        errorDetails = { message: errorData };
      }

      // If API key is invalid or missing, provide helpful error
      if (errorDetails.error?.message?.includes('API key')) {
        console.error('Google Books API Key Issue:', errorDetails.error.message);
        return NextResponse.json({ 
          error: 'Google Books API key is invalid or missing. Please check your environment configuration.',
          details: errorDetails.error.message,
          suggestion: 'Verify GOOGLE_BOOKS_API_KEY in your .env.local file'
        }, { status: 401 });
      }

      return NextResponse.json({ 
        error: `Google Books API error: ${googleResponse.statusText}`,
        details: errorDetails
      }, { status: googleResponse.status });
    }

    const googleData = await googleResponse.json();
    const booksFromGoogle: Book[] = googleData.items ? googleData.items.map(formatGoogleBook) : [];

    console.log(`Found ${booksFromGoogle.length} books for query: "${query}"`);
    
    return NextResponse.json(booksFromGoogle);
  } catch (error) {
    console.error('Failed to fetch books:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to fetch books from external APIs', 
      details: message 
    }, { status: 500 });
  }
}

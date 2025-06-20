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
    coverImageUrl: getHighestQualityCover(imageLinks),
    summary: volumeInfo.description || 'No summary available.',
    averageRating: volumeInfo.averageRating,
    genres: volumeInfo.categories || [],
    publicationYear,
    isbn,
  };
}

// Helper function to get the highest quality cover image
function getHighestQualityCover(imageLinks: any): string | undefined {
  if (!imageLinks) return undefined;
  
  // Priority order: extraLarge -> large -> medium -> small -> thumbnail -> smallThumbnail
  const coverUrl = imageLinks.extraLarge || 
                  imageLinks.large || 
                  imageLinks.medium || 
                  imageLinks.small || 
                  imageLinks.thumbnail || 
                  imageLinks.smallThumbnail;
  
  if (!coverUrl) return undefined;
  
  // Ensure HTTPS and try to get higher resolution by modifying the URL
  let highResUrl = coverUrl.replace('http:', 'https:');
  
  // For Google Books images, we can sometimes get higher resolution by modifying the URL parameters
  if (highResUrl.includes('books.google.com')) {
    // Remove size restrictions and zoom parameters to get full resolution
    highResUrl = highResUrl.replace(/&zoom=\d+/, '').replace(/&w=\d+/, '').replace(/&h=\d+/, '');
    // Add high resolution parameters
    if (!highResUrl.includes('zoom=')) {
      highResUrl += '&zoom=1';
    }
  }
  
  return highResUrl;
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
  const requestedMaxResults = parseInt(maxResultsParam, 10);
  // Google Books API has a maximum limit of 40 results per request
  const maxResults = Math.min(requestedMaxResults, 40);
  const startIndex = (page - 1) * maxResults;

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    // Build Google Books API URL without API key to use free quota
    const googleBooksUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&startIndex=${startIndex}&maxResults=${maxResults}`;

    console.log('Calling Google Books API (free quota):', googleBooksUrl);

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

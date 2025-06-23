"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/OptimizedAuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  searchBooks, 
  getBookDetails, 
  getBookReviews, 
  addBookReview,
  getUserBookInteraction,
  updateUserBookInteraction
} from '@/lib/services/bookService';
import { 
  likeReview, 
  unlikeReview, 
  addCommentToReview, 
  getReviewComments,
  updateReview,
  deleteReview
} from '@/lib/services/reviewService';
import { 
  likeComment, 
  unlikeComment, 
  deleteComment 
} from '@/lib/services/commentService';
import { 
  getUserReviews,
  getUserLists
} from '@/lib/services/userService';
import { 
  getListBooks
} from '@/lib/services/listService';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  result?: any;
  error?: any;
  duration?: number;
}

export default function DebugPage() {
  const { userProfile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [testReviewText, setTestReviewText] = useState('This is a test review for debugging purposes.');
  const [testCommentText, setTestCommentText] = useState('This is a test comment.');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Override console methods to capture logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args) => {
      setConsoleLogs(prev => [...prev, `[LOG] ${args.join(' ')}`]);
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      setConsoleLogs(prev => [...prev, `[ERROR] ${args.join(' ')}`]);
      originalConsoleError(...args);
    };

    console.warn = (...args) => {
      setConsoleLogs(prev => [...prev, `[WARN] ${args.join(' ')}`]);
      originalConsoleWarn(...args);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const addTestResult = (name: string, status: 'pending' | 'success' | 'error', result?: any, error?: any, duration?: number) => {
    setTestResults(prev => {
      const existingIndex = prev.findIndex(t => t.name === name);
      const newResult = { name, status, result, error, duration };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runTest = async (name: string, testFn: () => Promise<any>) => {
    const startTime = Date.now();
    addTestResult(name, 'pending');
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      addTestResult(name, 'success', result, null, duration);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`Test "${name}" failed:`, error);
      addTestResult(name, 'error', null, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        full: error
      }, duration);
      return null; // Don't throw, continue testing
    }
  };

  // Test Book Rating Update
  const testBookRatingUpdate = async () => {
    try {
      console.log('🔍 Testing book rating update...');
      
      // Get a book with reviews
      const searchResults = await searchBooks('Harry Potter');
      if (searchResults.items.length === 0) throw new Error('No books found for rating test');
      
      const book = searchResults.items[0];
      console.log('📖 Testing with book:', book.title, 'Current avg rating:', book.averageRating);
      
      // Get current reviews to check rating calculation
      const reviewsResponse = await getBookReviews(book.id);
      const reviews = reviewsResponse.items;
      console.log('📝 Found reviews:', reviews.length);
      
      if (reviews.length > 0) {
        const manualAverage = reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length;
        console.log('🧮 Manual average calculation:', manualAverage);
        console.log('📊 Database average rating:', book.averageRating);
        
        if (Math.abs(manualAverage - (book.averageRating || 0)) > 0.1) {
          console.warn('⚠️ Rating mismatch detected!');
          return { success: false, error: 'Rating calculation mismatch' };
        }
      }
      
      return { success: true, data: { bookId: book.id, avgRating: book.averageRating, reviewCount: reviews.length } };
    } catch (error) {
      console.error('❌ Book rating test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Test List Book Display
  const testListBookDisplay = async () => {
    try {
      console.log('🔍 Testing list book display...');
      
      // Get user's lists
      const userListsResponse = await getUserLists(userProfile!.id);
      const userLists = userListsResponse.items;
      if (userLists.length === 0) throw new Error('No lists found for display test');
      
      const list = userLists[0];
      console.log('📋 Testing with list:', list.name);
      
      // Get list books
      const listBooks = await getListBooks(list.id);
      console.log('📚 Found books in list:', listBooks.items.length);
      
      if (listBooks.items.length > 0) {
        const book = listBooks.items[0];
        console.log('📖 First book details:');
        console.log('  - Title:', book.title);
        console.log('  - Author:', book.author);
        console.log('  - Authors array:', (book as any).authors);
        console.log('  - Cover URL:', book.coverImageUrl);
        console.log('  - Cover image URL:', (book as any).cover_image_url);
        console.log('  - Average rating:', book.averageRating);
        console.log('  - DB average rating:', (book as any).average_rating);
        
        // Check for missing data
        const issues = [];
        if (!book.author || book.author === 'Unknown Author') issues.push('Missing/unknown author');
        if (!book.coverImageUrl) issues.push('Missing cover image URL');
        if (book.averageRating === undefined || book.averageRating === null) issues.push('Missing average rating');
        
        return { 
          success: issues.length === 0, 
          data: { listId: list.id, bookCount: listBooks.items.length, issues },
          error: issues.length > 0 ? issues.join(', ') : undefined
        };
      }
      
      return { success: true, data: { listId: list.id, bookCount: 0 } };
    } catch (error) {
      console.error('❌ List book display test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const runAllTests = async () => {
    if (!isAuthenticated || !userProfile) {
      toast({ title: "Error", description: "Please log in to run tests", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setConsoleLogs([]);

    try {
      // Test 1: Search for books
      const searchResults = await runTest('Search Books', async () => {
        return await searchBooks('Harry Potter', 1, 5);
      });

      let testBookId = selectedBookId;
      if (!testBookId && searchResults?.items?.length > 0) {
        testBookId = searchResults.items[0].id;
        setSelectedBookId(testBookId);
      }

      if (!testBookId) {
        console.error('No book ID available for testing');
        return;
      }

      // Test 2: Get book details
      const bookDetails = await runTest('Get Book Details', async () => {
        return await getBookDetails(testBookId);
      });

      // Test 3: Get user book interaction
      const userInteraction = await runTest('Get User Book Interaction', async () => {
        return await getUserBookInteraction(testBookId);
      });

      // Test 4: Update user book interaction
      await runTest('Update User Book Interaction', async () => {
        return await updateUserBookInteraction(testBookId, {
          is_read: true,
          rating: 5,
          read_date: new Date().toISOString().split('T')[0]
        });
      });

      // Test 5: Add/Update book review
      const newReview = await runTest('Add Book Review', async () => {
        return await addBookReview(testBookId, 5, testReviewText);
      });

      // Test 6: Get book reviews
      const bookReviews = await runTest('Get Book Reviews', async () => {
        return await getBookReviews(testBookId);
      });

      // Test 7: Get user reviews
      const userReviews = await runTest('Get User Reviews', async () => {
        return await getUserReviews(userProfile.id);
      });

      // Find the review we just created
      let reviewToTest = newReview;
      if (!reviewToTest && bookReviews?.items?.length > 0) {
        reviewToTest = bookReviews.items.find((r: any) => r.user_id === userProfile.id);
      }

      if (reviewToTest) {
        // Test 8: Like review
        await runTest('Like Review', async () => {
          return await likeReview(reviewToTest.id);
        });

        // Test 9: Unlike review
        await runTest('Unlike Review', async () => {
          return await unlikeReview(reviewToTest.id);
        });

        // Test 10: Add comment to review
        const newComment = await runTest('Add Comment to Review', async () => {
          return await addCommentToReview(reviewToTest.id, testCommentText);
        });

        // Test 11: Get review comments
        const reviewComments = await runTest('Get Review Comments', async () => {
          return await getReviewComments(reviewToTest.id);
        });

        if (newComment) {
          // Test 12: Like comment
          await runTest('Like Comment', async () => {
            return await likeComment(newComment.id);
          });

          // Test 13: Unlike comment
          await runTest('Unlike Comment', async () => {
            return await unlikeComment(newComment.id);
          });

          // Test 14: Reply to comment
          await runTest('Reply to Comment', async () => {
            return await addCommentToReview(reviewToTest.id, 'This is a reply', newComment.id);
          });
        }

        // Test 15: Update review
        await runTest('Update Review', async () => {
          return await updateReview(reviewToTest.id, 4, testReviewText + ' (Updated)');
        });

        // Test 16: Like review again
        await runTest('Like Review Again', async () => {
          return await likeReview(reviewToTest.id);
        });

        // Test 17: Get updated book reviews to check like state
        const updatedReviews = await runTest('Get Updated Book Reviews', async () => {
          return await getBookReviews(testBookId);
        });

        // Test 18: Verify book ratings were updated correctly
        await runTest('Verify Book Rating Updates', async () => {
          const bookDetails = await getBookDetails(testBookId);
          return {
            average_rating: bookDetails?.averageRating,
            total_ratings: (bookDetails as any)?.total_ratings,
            reviews_count: updatedReviews?.items?.length || 0
          };
        });

        // Test 19: Debug Book Data Structure
        await runTest('Debug Book Data Structure', async () => {
          const { data: rawBook, error } = await supabase
            .from('books')
            .select('*')
            .eq('id', testBookId)
            .single();
          
          if (error) throw error;
          
          console.log('Raw book from database:', rawBook);
          console.log('Processed book from service:', bookDetails);
          
          return {
            rawBook,
            processedBook: bookDetails,
            authorsArray: rawBook.authors,
            authorsLength: rawBook.authors?.length || 0,
            coverUrl: rawBook.cover_image_url,
            rating: rawBook.average_rating,
            totalRatings: rawBook.total_ratings
          };
        });

        // Test 20: Debug Search Results
        await runTest('Debug Search Results', async () => {
          console.log('Search results:', searchResults);
          
          return {
            totalItems: searchResults?.items?.length || 0,
            firstBook: searchResults?.items?.[0],
            authorsIssue: searchResults?.items?.map((book: any) => ({
              title: book.title,
              author: book.author,
              hasAuthor: !!book.author,
              authorType: typeof book.author
            })) || []
          };
        });

        // Test 19: Test comment liking functionality
        if (reviewComments?.items?.length > 0) {
          const firstComment = reviewComments.items[0];
          
          await runTest('Like First Comment', async () => {
            return await likeComment(firstComment.id);
          });

          await runTest('Unlike First Comment', async () => {
            return await unlikeComment(firstComment.id);
          });

          await runTest('Get Updated Comments After Like/Unlike', async () => {
            return await getReviewComments(reviewToTest.id);
          });
        }

        // Test 20: Test multiple like/unlike cycles on review
        await runTest('Multiple Like/Unlike Cycles', async () => {
          // Like -> Unlike -> Like -> Unlike
          await likeReview(reviewToTest.id);
          await unlikeReview(reviewToTest.id);
          await likeReview(reviewToTest.id);
          await unlikeReview(reviewToTest.id);
          
          // Get final state
          const finalReviews = await getBookReviews(testBookId);
          const finalReview = finalReviews.items.find((r: any) => r.id === reviewToTest.id);
          
          return {
            final_like_count: finalReview?.like_count,
            final_user_has_liked: finalReview?.current_user_has_liked
          };
        });
      }

      // Test Book Rating Update
      const bookRatingUpdateResult = await testBookRatingUpdate();
      if (bookRatingUpdateResult.success) {
        console.log('✅ Book rating update test passed');
      } else {
        console.error('❌ Book rating update test failed:', bookRatingUpdateResult.error);
        addTestResult('Book Rating Update', 'error', null, {
          message: bookRatingUpdateResult.error,
          stack: null,
          name: 'Book Rating Update',
          full: bookRatingUpdateResult
        });
      }

      // Test List Book Display
      const listBookDisplayResult = await testListBookDisplay();
      if (listBookDisplayResult.success) {
        console.log('✅ List book display test passed');
      } else {
        console.error('❌ List book display test failed:', listBookDisplayResult.error);
        addTestResult('List Book Display', 'error', null, {
          message: listBookDisplayResult.error,
          stack: null,
          name: 'List Book Display',
          full: listBookDisplayResult
        });
      }

      toast({ title: "Debug Tests Completed", description: "Check results below" });

    } catch (error) {
      console.error('Test suite failed:', error);
      toast({ title: "Tests Failed", description: "Check console for details", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setConsoleLogs([]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 border-yellow-300';
      case 'success':
        return 'bg-green-100 border-green-300';
      case 'error':
        return 'bg-red-100 border-red-300';
    }
  };

    // Debug tests are now integrated into the main runAllTests function

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-red-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to access the debug page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2 text-blue-500" />
            LibroVision Debug Center
          </CardTitle>
          <CardDescription>
            Test all review, comment, and social functionality with detailed error reporting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Test Book ID (optional):</label>
              <Input 
                value={selectedBookId} 
                onChange={(e) => setSelectedBookId(e.target.value)}
                placeholder="Leave empty to use search results"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Review Text:</label>
              <Input 
                value={testReviewText} 
                onChange={(e) => setTestReviewText(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Test Comment Text:</label>
            <Input 
              value={testCommentText} 
              onChange={(e) => setTestCommentText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center"
            >
              {isRunning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run All Tests
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {testResults.filter(t => t.status === 'success').length} passed, {' '}
              {testResults.filter(t => t.status === 'error').length} failed, {' '}
              {testResults.filter(t => t.status === 'pending').length} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((test, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded border ${getStatusColor(test.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <span className="font-medium">{test.name}</span>
                      {test.duration && (
                        <Badge variant="outline">{test.duration}ms</Badge>
                      )}
                    </div>
                  </div>
                  
                  {test.status === 'success' && test.result && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-green-700">Show Result</summary>
                      <pre className="mt-1 p-2 bg-green-50 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(test.result, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  {test.status === 'error' && test.error && (
                    <details className="mt-2" open>
                      <summary className="cursor-pointer text-sm text-red-700">Show Error</summary>
                      <pre className="mt-1 p-2 bg-red-50 rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(test.error, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Test individual components quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => runTest('Quick Search', () => searchBooks('test', 1, 3))}
              disabled={isRunning}
            >
              Test Search
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => runTest('Quick User Reviews', () => getUserReviews(userProfile?.id || ''))}
              disabled={isRunning}
            >
              Test User Reviews
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log('Current User Profile:', userProfile);
                console.log('Is Authenticated:', isAuthenticated);
              }}
            >
              Log Auth State
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.clear();
                setConsoleLogs([]);
              }}
            >
              Clear Console
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current State Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>User ID:</strong> {userProfile?.id}</div>
            <div><strong>Username:</strong> {userProfile?.username}</div>
            <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
            <div><strong>Selected Book ID:</strong> {selectedBookId || 'None'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
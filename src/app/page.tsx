"use client";
import { useAuth } from '@/contexts/OptimizedAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { userProfile, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && userProfile) {
        router.replace('/feed');
      }
      // If not authenticated, stay on home page (don't redirect to login)
    }
  }, [isAuthenticated, userProfile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Home page content for non-authenticated users
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold font-headline text-primary mb-4">
          Welcome to LibroVision
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Discover your next favorite book and connect with fellow readers
        </p>
        <div className="space-x-4">
          <a 
            href="/signup" 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
          <a 
            href="/discover" 
            className="inline-flex items-center px-6 py-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
          >
            Browse Books
          </a>
        </div>
      </div>
    </div>
  );
}

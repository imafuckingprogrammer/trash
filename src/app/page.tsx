
"use client";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProfileRedirectPage() {
  const { userProfile, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && userProfile) {
        router.replace(`/profile/${userProfile.username}`);
      } else {
        router.replace('/login?redirect=/profile');
      }
    }
  }, [isAuthenticated, userProfile, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Loading profile...</p>
    </div>
  );
}

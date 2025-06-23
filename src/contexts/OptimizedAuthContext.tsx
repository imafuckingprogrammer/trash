'use client';

import type { AuthUser, UserProfile } from '@/types';
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useMemo, 
  useCallback,
  type ReactNode 
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';

interface AuthContextType {
  authUser: AuthUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Separate function to fetch user profile for React Query
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        follower_count:follows!following_id(count),
        following_count:follows!follower_id(count)
      `)
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return {
      ...data,
      follower_count: data.follower_count?.[0]?.count || 0,
      following_count: data.following_count?.[0]?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export const OptimizedAuthProvider = React.memo(({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const queryClient = useQueryClient();

  // Use React Query for user profile with proper caching
  const { 
    data: userProfile, 
    isLoading: isProfileLoading,
    refetch: refetchProfile 
  } = useQuery({
    queryKey: queryKeys.user(authUser?.id || ''),
    queryFn: () => fetchUserProfile(authUser!.id),
    enabled: !!authUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setAuthUser({ 
              id: session.user.id, 
              email: session.user.email || undefined 
            });
          }
          setIsInitialLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setIsInitialLoading(false);
        }
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setAuthUser({ 
            id: session.user.id, 
            email: session.user.email || undefined 
          });
        } else {
          setAuthUser(null);
          // Clear user-related queries from cache
          queryClient.removeQueries({ queryKey: ['users'] });
          queryClient.removeQueries({ queryKey: ['feed'] });
          queryClient.removeQueries({ queryKey: ['notifications'] });
        }
        setIsInitialLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      if (error) throw error;
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Login failed');
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      username 
    }: { 
      email: string; 
      password: string; 
      username: string; 
    }) => {
      // First check if username is available
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (existingUser) {
        throw new Error('Username is already taken');
      }
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            username,
            full_name: username // Can be updated later
          } 
        } 
      });
      
      if (error) throw error;
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Signup failed');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
    onError: (error: any) => {
      throw new Error(error.message || 'Logout failed');
    },
  });

  // Memoized functions to prevent unnecessary re-renders
  const login = useCallback(async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  const signup = useCallback(async (email: string, password: string, username: string) => {
    await signupMutation.mutateAsync({ email, password, username });
  }, [signupMutation]);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const refreshProfile = useCallback(async () => {
    if (authUser?.id) {
      await refetchProfile();
    }
  }, [authUser?.id, refetchProfile]);

  // Memoized computed values
  const isLoading = useMemo(() => 
    isInitialLoading || 
    loginMutation.isPending || 
    signupMutation.isPending || 
    logoutMutation.isPending ||
    (!!authUser && isProfileLoading)
  , [
    isInitialLoading, 
    loginMutation.isPending, 
    signupMutation.isPending, 
    logoutMutation.isPending,
    authUser,
    isProfileLoading
  ]);

  const isAuthenticated = useMemo(() => !!authUser, [authUser]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    authUser,
    userProfile: userProfile || null,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshProfile,
  }), [
    authUser,
    userProfile,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshProfile,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
});

OptimizedAuthProvider.displayName = 'OptimizedAuthProvider';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an OptimizedAuthProvider');
  }
  return context;
}; 
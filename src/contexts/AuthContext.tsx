
"use client";

import type { AuthUser, UserProfile } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  authUser: AuthUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>; // Adjust as per your auth provider
  signup: (email: string, password: string, username: string) => Promise<void>; // Adjust
  logout: () => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<UserProfile | null>; // Added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setAuthUser({ id: session.user.id, email: session.user.email });
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
      }
      setIsLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
    setIsLoading(true);
        if (session?.user) {
          setAuthUser({ id: session.user.id, email: session.user.email });
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
        } else {
    setAuthUser(null); 
    setUserProfile(null);
        }
    setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
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
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      
      // Auth state change listener will handle setting user and profile
    } catch (error: any) {
    setIsLoading(false);
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, username: string) => {
    setIsLoading(true);
    try {
      // First check if username is available
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (existingUser) {
        throw new Error('Username is already taken');
      }
      
      const { error, data } = await supabase.auth.signUp({ 
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
      
      // Auth state change listener will handle setting user and profile
      // The handle_new_user() trigger will create the user profile automatically
    } catch (error: any) {
    setIsLoading(false);
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Auth state change listener will handle clearing user and profile
    } catch (error: any) {
    setIsLoading(false);
      throw new Error(error.message || 'Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ authUser, userProfile, isLoading, isAuthenticated: !!authUser, login, signup, logout, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import React from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import { SupabaseClient } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    // Vérifier si les variables d'environnement existent
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found, skipping initialization');
      setLoading(false);
      return;
    }
    
    try {
      const client = createClient();
      setSupabase(client);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      setLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    if (!supabase) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUser({
            ...profile,
            email: session.user.email!,
          } as User);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchUser();
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [supabase, fetchUser]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) await fetchUser();
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

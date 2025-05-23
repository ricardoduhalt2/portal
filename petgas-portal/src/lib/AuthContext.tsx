"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface ClientProfile {
  id: string;
  email: string;
  full_name?: string | null;
  solana_wallet?: string | null;
  bnb_wallet?: string | null;
  pgc_balance?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ClientProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSetProfile = async (currentUser: User) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      // Check if a client profile exists
      let { data: clientData, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') { // PGRST116: "Resource not found"
        // Profile doesn't exist, create it
        console.log(`Profile not found for user ${currentUser.id}, creating one.`);
        const { data: newClientData, error: insertError } = await supabase
          .from('clients')
          .insert({
            id: currentUser.id, // Use Supabase Auth user ID as client ID
            email: currentUser.email!, // Email is guaranteed to exist for authenticated user
            full_name: currentUser.user_metadata?.full_name || null, // Optional: prefill from Supabase user_metadata
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating client profile:', insertError);
          throw insertError;
        }
        clientData = newClientData;
        console.log('New profile created:', clientData);
      } else if (fetchError) {
        console.error('Error fetching client profile:', fetchError);
        throw fetchError;
      }
      
      setProfile(clientData as ClientProfile);
    } catch (error) {
      console.error('Error in profile fetching/creation process:', error);
      setProfile(null); // Ensure profile is null on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchAndSetProfile(currentUser);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth event:', event, currentSession);
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            await fetchAndSetProfile(currentUser);
          }
        } else {
          setProfile(null); // Clear profile on sign out
          setLoading(false);
        }
        
        // Initial load might have already set loading to false.
        // Ensure loading is false after auth state change processing.
        if (event !== 'INITIAL_SESSION') {
             setLoading(false);
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
    // Redirect handled by consuming components or route guards
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchAndSetProfile(user);
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

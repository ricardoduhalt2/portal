"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth as firebaseAuth } from './firebaseClient'; // Existing Firebase auth instance
import type { User as FirebaseUser } from 'firebase/auth'; // Firebase User type
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

interface AdminAuthContextType {
  adminUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setAdminUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(firebaseAuth);
      setAdminUser(null); // Explicitly set user to null
    } catch (error) {
      console.error("Error signing out admin:", error);
      // Optionally, set an error state here to display to the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

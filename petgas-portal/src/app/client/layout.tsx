"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import React from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login'); // Redirect to login after sign out
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-700 text-lg">Loading Petgas Portal...</p>
        {/* You can add a more sophisticated loading spinner here */}
      </div>
    );
  }

  // If not loading and no user, redirect to login.
  // This is a layout-level guard. Individual pages might also have their own.
  if (!user && !loading) {
    if (typeof window !== 'undefined') { // Ensure this runs only client-side
        router.replace('/login');
    }
    return null; // Render nothing while redirecting
  }
  
  return (
    <div className="min-h-screen bg-[var(--petgas-gray-light)] flex flex-col">
      <header className="bg-[var(--petgas-white)] border-b border-[var(--input-border-color)] sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/client/dashboard" className="flex items-center space-x-2 text-xl font-semibold text-[var(--petgas-green-primary)] hover:text-[var(--petgas-green-dark)]">
                <span className="h-8 w-8 bg-[var(--petgas-green-primary)] rounded-full flex items-center justify-center text-white text-lg font-bold">
                  P
                </span>
                <span>Petgas Portal</span>
              </Link>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              {user && (
                <>
                  <span className="text-sm text-[var(--text-color-muted)] hidden md:block mr-2">
                    Welcome, {profile?.full_name || profile?.email || user.email}
                  </span>
                  <Link
                    href="/client/dashboard"
                    className={`font-medium text-sm px-3 py-2 ${
                      pathname === '/client/dashboard' || pathname === '/client'
                        ? 'text-[var(--primary-accent)] border-b-2 border-[var(--primary-accent)]'
                        : 'text-[var(--text-color)] hover:text-[var(--primary-accent)]'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/client/submit-activity"
                    className={`font-medium text-sm px-3 py-2 ${
                      pathname === '/client/submit-activity'
                        ? 'text-[var(--primary-accent)] border-b-2 border-[var(--primary-accent)]'
                        : 'text-[var(--text-color)] hover:text-[var(--primary-accent)]'
                    }`}
                  >
                    Submit Activity
                  </Link>
                  <Link
                    href="/client/profile"
                    className={`font-medium text-sm px-3 py-2 ${
                      pathname === '/client/profile'
                        ? 'text-[var(--primary-accent)] border-b-2 border-[var(--primary-accent)]'
                        : 'text-[var(--text-color)] hover:text-[var(--primary-accent)]'
                    }`}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="btn-secondary px-3 py-2 text-sm" // Using btn-secondary for green
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Conditionally render children only if user is loaded and present */}
        {user && !loading ? children : null}
      </main>
      <footer className="bg-[var(--petgas-white)] border-t border-[var(--input-border-color)]">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-[var(--text-color-muted)]">
          &copy; {new Date().getFullYear()} Petgas. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

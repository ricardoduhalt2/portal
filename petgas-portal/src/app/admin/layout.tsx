"use client";

import React, { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';
import Head from 'next/head';

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { adminUser, loading, signOut } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!adminUser && pathname !== '/admin/login') {
        router.replace('/admin/login');
      } else if (adminUser && pathname === '/admin/login') {
        router.replace('/admin/dashboard');
      }
    }
  }, [adminUser, loading, router, pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
           <svg className="mx-auto h-12 w-12 animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-300">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }
  
  // If not an admin user and not on the login page, or if an admin user is on the login page,
  // we render null because the useEffect hook is handling the redirect.
  // This prevents flashing of content before redirect.
  if ((!adminUser && pathname !== '/admin/login') || (adminUser && pathname === '/admin/login')) {
    return null;
  }


  return (
    <>
      <Head>
        <title>Petgas Admin Panel</title>
      </Head>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        {adminUser && pathname !== '/admin/login' && ( // Only show header if logged in and not on login page
          <header className="bg-gray-800 shadow-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-indigo-400">
                    Petgas Admin Panel
                  </h1>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-400 mr-4 hidden sm:block">
                    Welcome, {adminUser.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
         {adminUser && pathname !== '/admin/login' && (
            <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
                <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Petgas Admin.
                </div>
            </footer>
        )}
      </div>
    </>
  );
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}

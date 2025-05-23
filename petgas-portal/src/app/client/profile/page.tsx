"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ClientProfile } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [solanaWallet, setSolanaWallet] = useState('');
  const [bnbWallet, setBnbWallet] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setSolanaWallet(profile.solana_wallet || '');
      setBnbWallet(profile.bnb_wallet || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    setMessage('');
    setError('');

    if (!user || !profile) {
      setError('You must be logged in to update your profile.');
      setFormLoading(false);
      return;
    }

    try {
      const updates: Partial<ClientProfile> & { updated_at: string } = {
        id: user.id, // Ensure ID is included for the upsert
        full_name: fullName,
        solana_wallet: solanaWallet,
        bnb_wallet: bnbWallet,
        updated_at: new Date().toISOString(),
        email: profile.email, // Keep email from original profile data
      };

      const { error: updateError } = await supabase
        .from('clients')
        .upsert(updates, { onConflict: 'id' })
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
      
      await refreshProfile(); // Refresh profile data in context
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      console.error('Profile update catch block error:', err);
      setError(err.error_description || err.message || 'Failed to update profile.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login'); // Redirect to login after sign out
  };

  if (authLoading || !profile && user) { // Still loading auth or loading profile
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading your profile...</p>
        {/* You can add a spinner here */}
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback or if redirect hasn't happened yet:
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <p className="text-gray-700">Redirecting to login...</p>
        </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>My Profile | Petgas Portal</title>
      </Head>
      {/* Background is inherited from ClientLayout's main content area (bg-[var(--petgas-gray-light)]) */}
      {/* py-8 px-4 etc. also from ClientLayout's main, so removed here to avoid double padding */}
      <div className="mx-auto max-w-2xl">
          <div className="bg-[var(--petgas-white)] shadow-xl rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-[var(--petgas-green-dark)]">Your Profile</h1>
              <button
                onClick={handleSignOut}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-600 border border-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Logout
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-color)]">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={profile?.email || ''}
                  readOnly
                  className="input-styled mt-1 block w-full bg-[var(--petgas-gray-light)] opacity-75 cursor-not-allowed p-3"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[var(--text-color)]">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-styled mt-1 block w-full p-3"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="solanaWallet" className="block text-sm font-medium text-[var(--text-color)]">
                  Solana Wallet Address
                </label>
                <input
                  type="text"
                  name="solanaWallet"
                  id="solanaWallet"
                  value={solanaWallet}
                  onChange={(e) => setSolanaWallet(e.target.value)}
                  className="input-styled mt-1 block w-full p-3"
                  placeholder="Your Solana wallet address (optional)"
                />
              </div>

              <div>
                <label htmlFor="bnbWallet" className="block text-sm font-medium text-[var(--text-color)]">
                  BNB Smart Chain Wallet Address
                </label>
                <input
                  type="text"
                  name="bnbWallet"
                  id="bnbWallet"
                  value={bnbWallet}
                  onChange={(e) => setBnbWallet(e.target.value)}
                  className="input-styled mt-1 block w-full p-3"
                  placeholder="Your BNB wallet address (optional)"
                />
              </div>
              
              <div>
                <label htmlFor="pgcBalance" className="block text-sm font-medium text-[var(--text-color)]">
                  PGC Balance
                </label>
                <input
                  type="text"
                  name="pgcBalance"
                  id="pgcBalance"
                  value={profile?.pgc_balance !== undefined && profile?.pgc_balance !== null ? String(profile.pgc_balance) : '0'}
                  readOnly
                  className="input-styled mt-1 block w-full bg-[var(--petgas-gray-light)] opacity-75 cursor-not-allowed p-3"
                />
              </div>


              {message && (
                <p className="text-sm text-[var(--petgas-green-primary)] bg-green-100 p-3 rounded-md">
                  {message}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md"> {/* Standard red for error is fine */}
                  {error}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={formLoading || authLoading}
                  className="btn-primary group relative flex w-full justify-center py-3 px-4 text-sm"
                >
                  {formLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // This URL needs to be added to your Supabase email templates and Redirect URLs list
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        throw signInError;
      }
      setMessage('Check your email for the login link!');
    } catch (err: any) {
      console.error('Error signing in:', err);
      setError(err.error_description || err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | Petgas Portal</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--petgas-gray-light)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            {/* Placeholder for Petgas Logo - Replace with actual Image component if available */}
            <div className="mx-auto h-16 w-16 bg-[var(--petgas-green-primary)] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              P
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-[var(--petgas-green-primary)]">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6 rounded-lg bg-[var(--petgas-white)] p-8 shadow-xl" onSubmit={handleLogin}>
            <div> {/* Adjusted spacing for single input field */}
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-styled relative block w-full" // Applied .input-styled
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary group relative flex w-full justify-center py-3 px-4 text-sm" // Applied .btn-primary
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Send Magic Link'
                )}
              </button>
            </div>

            {message && (
              <p className="mt-2 text-center text-sm text-[var(--petgas-green-primary)]">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-2 text-center text-sm text-red-600"> {/* Standard red for errors is fine */}
                {error}
              </p>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-[var(--text-color-muted)]">
            We'll email you a magic link for a password-free sign in.
          </p>
        </div>
      </div>
    </>
  );
}

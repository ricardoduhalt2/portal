"use client";

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClientProfile } from '@/lib/AuthContext'; // Re-use client profile type
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/AdminAuthContext';

export default function EditClientPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<Partial<ClientProfile>>({
    full_name: '',
    email: '', // Admin should be very cautious changing this
    solana_wallet: '',
    bnb_wallet: '',
    pgc_balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!adminAuthLoading && !adminUser) {
      router.replace('/admin/login');
      return;
    }
    if (adminUser && clientId) {
      setLoading(true);
      supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
        .then(({ data, error: fetchError }) => {
          if (fetchError) {
            throw fetchError;
          }
          if (data) {
            setClient({
              full_name: data.full_name || '',
              email: data.email || '',
              solana_wallet: data.solana_wallet || '',
              bnb_wallet: data.bnb_wallet || '',
              pgc_balance: data.pgc_balance === null || data.pgc_balance === undefined ? 0 : Number(data.pgc_balance),
            });
          } else {
            setError("Client not found.");
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching client for edit:", err);
          setError(err.message || "Failed to fetch client data.");
          setLoading(false);
        });
    }
  }, [adminUser, adminAuthLoading, clientId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClient(prev => ({ ...prev, [name]: name === 'pgc_balance' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientId) {
      setError("Client ID is missing.");
      return;
    }
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);

    const updates = {
        full_name: client.full_name,
        // email: client.email, // Be very careful with email updates
        solana_wallet: client.solana_wallet,
        bnb_wallet: client.bnb_wallet,
        pgc_balance: client.pgc_balance,
        updated_at: new Date().toISOString(),
    };

    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', clientId);

      if (updateError) throw updateError;
      setSuccessMessage("Client profile updated successfully!");
      // Optionally, refresh data or navigate
      // router.push('/admin/clients'); 
    } catch (err: any) {
      console.error("Error updating client:", err);
      setError(err.message || "Failed to update client profile.");
    } finally {
      setFormLoading(false);
    }
  };
  
  if (loading || adminAuthLoading) {
    return (
      <div className="flex items-center justify-center p-10 text-gray-300">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading client details...
      </div>
    );
  }

  if (error && !client.email) { // Show main error if client data couldn't be loaded
    return <p className="text-center text-red-400 p-10">Error: {error}</p>;
  }

  return (
    <>
      <Head>
        <title>Edit Client | Petgas Admin Panel</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400">
            Edit Client: <span className="text-gray-300">{client.full_name || client.email}</span>
            </h1>
            <Link href="/admin/clients" legacyBehavior>
                <a className="text-sm text-indigo-400 hover:text-indigo-300">&larr; Back to Client List</a>
            </Link>
        </div>

        {client.email ? ( // Only show form if client data is loaded
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                id="full_name"
                value={client.full_name || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address <span className="text-xs text-yellow-400">(Caution: Linked to Supabase Auth)</span>
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={client.email || ''}
                readOnly // To prevent accidental changes that could de-sync with Supabase Auth user
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-600 text-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 cursor-not-allowed"
              />
               <p className="mt-1 text-xs text-gray-400">
                Changing email address here is disabled as it's the primary identifier for Supabase Authentication. 
                If an email change is necessary, it must be handled directly within Supabase Auth or by having the user change their email.
              </p>
            </div>

            <div>
              <label htmlFor="solana_wallet" className="block text-sm font-medium text-gray-300">
                Solana Wallet Address
              </label>
              <input
                type="text"
                name="solana_wallet"
                id="solana_wallet"
                value={client.solana_wallet || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                placeholder="Solana wallet (optional)"
              />
            </div>

            <div>
              <label htmlFor="bnb_wallet" className="block text-sm font-medium text-gray-300">
                BNB Smart Chain Wallet Address
              </label>
              <input
                type="text"
                name="bnb_wallet"
                id="bnb_wallet"
                value={client.bnb_wallet || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                placeholder="BNB wallet (optional)"
              />
            </div>
            
            <div>
              <label htmlFor="pgc_balance" className="block text-sm font-medium text-gray-300">
                PGC Balance
              </label>
              <input
                type="number"
                name="pgc_balance"
                id="pgc_balance"
                value={client.pgc_balance === null || client.pgc_balance === undefined ? '' : client.pgc_balance}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
              />
            </div>

            {successMessage && <p className="text-sm text-green-400 bg-green-900/50 p-3 rounded-md">{successMessage}</p>}
            {error && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">Error: {error}</p>}
            
            <div className="flex justify-end space-x-3">
                 <Link href="/admin/clients" legacyBehavior>
                    <a className="px-5 py-2.5 text-sm rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50">
                        Cancel
                    </a>
                </Link>
                <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2.5 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {formLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                    </>
                    ) : 'Save Changes'}
                </button>
            </div>
          </form>
        ) : (
           !loading && <p className="text-center text-red-400 p-10">Client data could not be loaded or client does not exist.</p>
        )}
      </div>
    </>
  );
}

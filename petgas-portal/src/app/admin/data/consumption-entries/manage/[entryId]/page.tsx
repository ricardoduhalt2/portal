"use client";

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/AdminAuthContext';

interface ConsumptionEntryDetail {
  id: string;
  transaction_date: string; 
  liters_consumed: number;
  client_id: string;
  clients: {
    email: string;
    full_name: string | null;
  } | null;
  created_at: string;
}

export default function ManageSingleConsumptionEntryPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const entryId = params?.entryId as string;

  const [entry, setEntry] = useState<ConsumptionEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Editable fields
  const [editableLiters, setEditableLiters] = useState<number>(0);
  // Optional: If transaction_date should be editable
  // const [editableTransactionDate, setEditableTransactionDate] = useState<string>('');


  const fetchEntryDetails = async () => {
    if (!entryId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('petgas_consumption_entries')
        .select(`
          id, transaction_date, created_at, liters_consumed, client_id,
          clients (email, full_name)
        `)
        .eq('id', entryId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Entry not found.");
      
      setEntry(data as ConsumptionEntryDetail);
      setEditableLiters(data.liters_consumed);
      // if (data.transaction_date) {
      //   setEditableTransactionDate(new Date(data.transaction_date).toISOString().split('T')[0]);
      // }

    } catch (err: any) {
      console.error("Error fetching entry details:", err);
      setError(err.message || "Failed to fetch entry details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminAuthLoading && !adminUser) {
      router.replace('/admin/login');
      return;
    }
    if (adminUser && entryId) {
      fetchEntryDetails();
    }
  }, [adminUser, adminAuthLoading, entryId, router]);

  const handleUpdateEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entry) return;
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);

    const updates: Partial<ConsumptionEntryDetail> & { updated_at?: string } = {
        liters_consumed: editableLiters,
        // transaction_date: new Date(editableTransactionDate).toISOString(), // If editable
        updated_at: new Date().toISOString(), // Assuming an updated_at field for this table too
    };


    try {
      const { error: updateError } = await supabase
        .from('petgas_consumption_entries')
        .update(updates)
        .eq('id', entry.id);

      if (updateError) throw updateError;
      setSuccessMessage("Consumption entry updated successfully!");
      fetchEntryDetails(); 
    } catch (err: any) {
      console.error("Error updating entry:", err);
      setError(err.message || "Failed to update entry.");
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
        Loading entry details...
      </div>
    );
  }

  if (error && !entry) {
    return <p className="text-center text-red-400 p-10">Error: {error}</p>;
  }
  
  if (!entry) {
    return <p className="text-center text-gray-400 p-10">Consumption entry not found.</p>;
  }

  return (
    <>
      <Head>
        <title>Manage Consumption Entry | Petgas Admin</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400">
                Manage Consumption Entry
            </h1>
            <Link href="/admin/data/consumption-entries" legacyBehavior>
                <a className="text-sm text-indigo-400 hover:text-indigo-300">&larr; Back to All Consumption Entries</a>
            </Link>
        </div>

        {/* Display Entry Info */}
        <div className="mb-8 bg-gray-750 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-4">Entry Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div><strong className="text-gray-400">Entry ID:</strong> <span className="text-gray-200">{entry.id}</span></div>
                <div><strong className="text-gray-400">Client:</strong> <span className="text-gray-200">{entry.clients?.full_name || entry.clients?.email || 'N/A'}</span></div>
                <div><strong className="text-gray-400">Transaction Date:</strong> <span className="text-gray-200">{new Date(entry.transaction_date).toLocaleDateString()}</span></div>
                <div><strong className="text-gray-400">Logged At:</strong> <span className="text-gray-200">{new Date(entry.created_at).toLocaleString()}</span></div>
            </div>
        </div>
        
        {/* Update Form */}
        <form onSubmit={handleUpdateEntry} className="bg-gray-750 p-6 rounded-lg shadow space-y-6">
            <h2 className="text-xl font-semibold text-indigo-300 mb-4">Update Entry</h2>
            <div>
                <label htmlFor="editableLiters" className="block text-sm font-medium text-gray-300">Liters Consumed</label>
                <input
                    type="number"
                    id="editableLiters"
                    value={editableLiters}
                    onChange={(e) => setEditableLiters(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                />
            </div>
            {/* 
            Optional: Make transaction_date editable
            <div>
                <label htmlFor="editableTransactionDate" className="block text-sm font-medium text-gray-300">Transaction Date</label>
                <input
                    type="date"
                    id="editableTransactionDate"
                    value={editableTransactionDate}
                    onChange={(e) => setEditableTransactionDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                />
            </div>
            */}

            {error && !successMessage && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">Error updating: {error}</p>}
            {successMessage && <p className="text-sm text-green-400 bg-green-900/50 p-3 rounded-md">{successMessage}</p>}
            
            <div className="flex justify-end">
                <button type="submit" disabled={formLoading}
                        className="px-5 py-2.5 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                    {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </>
  );
}

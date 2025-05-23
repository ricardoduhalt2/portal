"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import { useAdminAuth } from '@/lib/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface MitigationEntryAdminView {
  id: string;
  created_at: string;
  mitigated_plastic_kg: number;
  status: string; // 'pending', 'approved', 'rejected'
  client_id: string;
  clients: { // Joined data
    email: string;
    full_name: string | null;
  } | null;
}

const ENTRIES_PER_PAGE = 15;

export default function ListMitigationEntriesPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<MitigationEntryAdminView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(''); // 'all', 'pending', 'approved', 'rejected'
  const [page, setPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchMitigationEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('plastic_mitigation_entries')
        .select('id, created_at, mitigated_plastic_kg, status, client_id, clients(email, full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ENTRIES_PER_PAGE, (page + 1) * ENTRIES_PER_PAGE -1);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      setEntries(data as MitigationEntryAdminView[] || []);
      setTotalCount(count || 0);

    } catch (err: any) {
      console.error("Error fetching mitigation entries:", err);
      setError(err.message || "Failed to fetch entries.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!adminAuthLoading && !adminUser) {
      router.replace('/admin/login');
      return;
    }
    if (adminUser) {
      fetchMitigationEntries();
    }
  }, [adminUser, adminAuthLoading, router, statusFilter, page]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(0); // Reset to first page on filter change
  };
  
  const totalPages = Math.ceil(totalCount / ENTRIES_PER_PAGE);

  if (adminAuthLoading) { // Only show main loader during auth check
    return (
      <div className="flex items-center justify-center p-10 text-gray-300">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Manage Mitigation Entries | Petgas Admin</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400 mb-4 sm:mb-0">
            Plastic Mitigation Entries
          </h1>
          <div>
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-300 mr-2">Filter by status:</label>
            <select
              id="statusFilter"
              name="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading && (
             <div className="flex items-center justify-center p-10 text-gray-300">
                <svg className="animate-spin h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching entries...
            </div>
        )}
        {error && <p className="text-center text-red-400 p-4">Error: {error}</p>}
        
        {!loading && !error && entries.length === 0 && (
          <p className="text-center text-gray-400 py-8">No mitigation entries found for the selected filter.</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-lg shadow mb-6">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Date Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Plastic (kg)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-650 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        {entry.clients?.full_name || entry.clients?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{entry.mitigated_plastic_kg.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'approved' ? 'bg-green-700 text-green-100' :
                          entry.status === 'rejected' ? 'bg-red-700 text-red-100' :
                          'bg-yellow-700 text-yellow-100'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link href={`/admin/data/mitigation-entries/manage/${entry.id}`} legacyBehavior>
                          <a className="text-indigo-400 hover:text-indigo-300">View/Manage</a>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 text-sm text-gray-400">
                    <button 
                        onClick={() => setPage(p => Math.max(0, p - 1))} 
                        disabled={page === 0 || loading}
                        className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span>Page {page + 1} of {totalPages} (Total: {totalCount} entries)</span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
                        disabled={page === totalPages - 1 || loading}
                        className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

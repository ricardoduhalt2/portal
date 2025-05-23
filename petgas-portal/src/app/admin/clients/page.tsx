"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Supabase client
import { ClientProfile } from '@/lib/AuthContext'; // Re-use client profile type for structure
import Link from 'next/link';
import Head from 'next/head';
import { useAdminAuth } from '@/lib/AdminAuthContext'; // For protecting the page
import { useRouter } from 'next/navigation';

// Define a more specific type for clients in admin view if needed, or reuse ClientProfile
type AdminClientView = ClientProfile & {
    // any admin specific fields if joined, for now ClientProfile is good
};

export default function ManageClientsPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();

  const [clients, setClients] = useState<AdminClientView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<AdminClientView | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setClients(data as AdminClientView[] || []);
    } catch (err: any) {
      console.error("Error fetching clients:", err);
      setError(err.message || "Failed to fetch clients.");
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
        fetchClients();
    }
  }, [adminUser, adminAuthLoading, router]);

  const handleDeleteRequest = (client: AdminClientView) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    setDeleteLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientToDelete.id);

      if (deleteError) throw deleteError;
      
      setClients(clients.filter(c => c.id !== clientToDelete.id));
      setShowDeleteModal(false);
      setClientToDelete(null);
    } catch (err: any) {
      console.error("Error deleting client:", err);
      setError(err.message || "Failed to delete client.");
      // Keep modal open to show error or handle differently
    } finally {
      setDeleteLoading(false);
    }
  };
  
  if (adminAuthLoading || loading) {
    return (
      <div className="flex items-center justify-center p-10 text-gray-300">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading client data...
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-400 p-10">Error: {error}</p>;
  }
  
  if (!adminUser) {
    // Fallback if redirect hasn't completed
    return <p className="text-center text-red-400 p-10">Access Denied. Please log in.</p>;
  }

  return (
    <>
      <Head>
        <title>Manage Clients | Petgas Admin Panel</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400 mb-4 sm:mb-0">
            Client Management
          </h1>
          {/* "Add client" instruction area */}
        </div>

        <div className="bg-gray-700 border border-gray-600 p-4 rounded-md mb-8 text-sm text-gray-300">
          <h3 className="font-semibold text-indigo-300 mb-2">Adding New Clients:</h3>
          <p>
            To add a new client, instruct them to visit the client portal and sign up using their email address via the Magic Link. 
            Their record will appear here automatically once they log in for the first time. 
            The client's unique ID is generated upon their first successful authentication with Supabase.
          </p>
        </div>

        {clients.length === 0 ? (
          <p className="text-center text-gray-400">No clients found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Full Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">PGC Balance</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Registered On</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-650 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{client.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{client.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{client.pgc_balance?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link href={`/admin/clients/view/${client.id}`} legacyBehavior>
                        <a className="text-blue-400 hover:text-blue-300">View</a>
                      </Link>
                      <Link href={`/admin/clients/edit/${client.id}`} legacyBehavior>
                        <a className="text-yellow-400 hover:text-yellow-300">Edit</a>
                      </Link>
                      <button
                        onClick={() => handleDeleteRequest(client)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the client <span className="font-bold">{clientToDelete.full_name || clientToDelete.email}</span>? 
              This will delete the client record and all their associated data (mitigation entries, consumption logs, rewards). This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleteLoading ? (
                    <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                    </>
                ) : 'Delete Client'}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

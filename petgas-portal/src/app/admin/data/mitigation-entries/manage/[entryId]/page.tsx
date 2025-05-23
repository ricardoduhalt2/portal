"use client";

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useAdminAuth } from '@/lib/AdminAuthContext';

interface MitigationEntryDetail {
  id: string;
  created_at: string;
  mitigated_plastic_kg: number;
  status: string;
  client_id: string;
  clients: {
    email: string;
    full_name: string | null;
  } | null;
  mitigation_activity_images: {
    id: string; // image record ID
    image_url: string;
  }[];
}

export default function ManageSingleMitigationEntryPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const entryId = params?.entryId as string;

  const [entry, setEntry] = useState<MitigationEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false); // For updates (kg, status)
  const [imageDeleteLoading, setImageDeleteLoading] = useState<string | null>(null); // Stores ID of image being deleted

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Editable fields
  const [editableKg, setEditableKg] = useState<number>(0);
  const [editableStatus, setEditableStatus] = useState<string>('');
  
  // Image modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  const fetchEntryDetails = async () => {
    if (!entryId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('plastic_mitigation_entries')
        .select(`
          id, created_at, mitigated_plastic_kg, status, client_id,
          clients (email, full_name),
          mitigation_activity_images (id, image_url)
        `)
        .eq('id', entryId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Entry not found.");
      
      setEntry(data as MitigationEntryDetail);
      setEditableKg(data.mitigated_plastic_kg);
      setEditableStatus(data.status);

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

  const handleUpdateEntry = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!entry) return;
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: updateError } = await supabase
        .from('plastic_mitigation_entries')
        .update({
          mitigated_plastic_kg: editableKg,
          status: editableStatus,
          updated_at: new Date().toISOString(), // Assuming you have an updated_at field
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;
      setSuccessMessage("Entry updated successfully!");
      // Refresh data to show changes
      fetchEntryDetails(); 
    } catch (err: any) {
      console.error("Error updating entry:", err);
      setError(err.message || "Failed to update entry.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
      return;
    }
    setImageDeleteLoading(imageId);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Delete from storage
      const_path = imageUrl.substring(imageUrl.indexOf('mitigation-images/') + 'mitigation-images/'.length);
      const { error: storageError } = await supabase.storage
        .from('mitigation-images')
        .remove([const_path]);
      if (storageError) {
        // Log error but attempt to delete DB record anyway, or handle more gracefully
        console.warn("Storage deletion warning:", storageError.message, "- If the DB record is deleted, this might result in an orphaned file if it wasn't already deleted, or a non-issue if the file didn't exist. Review Supabase Storage if issues persist.");
      }

      // 2. Delete from mitigation_activity_images table
      const { error: dbError } = await supabase
        .from('mitigation_activity_images')
        .delete()
        .eq('id', imageId);
      if (dbError) throw dbError;

      setSuccessMessage("Image deleted successfully.");
      // Refresh entry details to update image list
      fetchEntryDetails();

    } catch (err: any) {
      console.error("Error deleting image:", err);
      setError(err.message || "Failed to delete image.");
    } finally {
      setImageDeleteLoading(null);
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
    return <p className="text-center text-gray-400 p-10">Mitigation entry not found.</p>;
  }

  return (
    <>
      <Head>
        <title>Manage Mitigation Entry | Petgas Admin</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400">
                Manage Mitigation Entry
            </h1>
            <Link href="/admin/data/mitigation-entries" legacyBehavior>
                <a className="text-sm text-indigo-400 hover:text-indigo-300">&larr; Back to All Entries</a>
            </Link>
        </div>

        {/* Display Entry Info */}
        <div className="mb-8 bg-gray-750 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-4">Entry Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div><strong className="text-gray-400">Entry ID:</strong> <span className="text-gray-200">{entry.id}</span></div>
                <div><strong className="text-gray-400">Client:</strong> <span className="text-gray-200">{entry.clients?.full_name || entry.clients?.email || 'N/A'} ({entry.client_id})</span></div>
                <div><strong className="text-gray-400">Date Submitted:</strong> <span className="text-gray-200">{new Date(entry.created_at).toLocaleString()}</span></div>
            </div>
        </div>
        
        {/* Update Form */}
        <form onSubmit={handleUpdateEntry} className="mb-8 bg-gray-750 p-6 rounded-lg shadow space-y-6">
            <h2 className="text-xl font-semibold text-indigo-300 mb-4">Update Entry</h2>
            <div>
                <label htmlFor="editableKg" className="block text-sm font-medium text-gray-300">Mitigated Plastic (kg)</label>
                <input
                    type="number"
                    id="editableKg"
                    value={editableKg}
                    onChange={(e) => setEditableKg(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                />
            </div>
            <div>
                <label htmlFor="editableStatus" className="block text-sm font-medium text-gray-300">Status</label>
                <select
                    id="editableStatus"
                    value={editableStatus}
                    onChange={(e) => setEditableStatus(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
            {error && !successMessage && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">Error updating: {error}</p>}
            {successMessage && <p className="text-sm text-green-400 bg-green-900/50 p-3 rounded-md">{successMessage}</p>}
            <div className="flex justify-end">
                <button type="submit" disabled={formLoading}
                        className="px-5 py-2.5 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                    {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>

        {/* View Images */}
        <section className="bg-gray-750 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-indigo-300 mb-4">Associated Images</h2>
          {entry.mitigation_activity_images && entry.mitigation_activity_images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {entry.mitigation_activity_images.map(img => (
                <div key={img.id} className="relative group">
                  <Image 
                    src={img.image_url} 
                    alt={`Mitigation evidence ${img.id}`} 
                    width={150} height={150} 
                    objectFit="cover" 
                    className="rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(img.image_url)}
                  />
                  <button
                    onClick={() => handleDeleteImage(img.id, img.image_url)}
                    disabled={imageDeleteLoading === img.id}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 text-xs leading-none opacity-80 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete Image"
                  >
                    {imageDeleteLoading === img.id ? '...' : 'X'}
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No images associated with this entry.</p>}
          {error && imageDeleteLoading && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md mt-4">Error deleting image: {error}</p>}
        </section>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4"
            onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-3xl max-h-[90vh] bg-gray-900 p-1 rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setSelectedImage(null)} 
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 text-2xl leading-none z-[101]"
                    aria-label="Close image viewer"
                >
                    &times;
                </button>
                <Image src={selectedImage} alt="Enlarged activity evidence" width={1000} height={700} style={{ objectFit: 'contain', maxHeight: '85vh', width: 'auto' }} className="rounded" />
            </div>
        </div>
      )}
    </>
  );
}

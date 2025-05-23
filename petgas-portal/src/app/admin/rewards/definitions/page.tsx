"use client";

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';
import { useAdminAuth } from '@/lib/AdminAuthContext';
import { useRouter } from 'next/navigation';

interface RewardDefinition {
  id: string;
  name: string;
  description: string | null;
  pgc_amount: number;
  criteria_plastic_kg: number | null;
  criteria_petgas_liters: number | null;
  created_at?: string;
}

export default function ManageRewardDefinitionsPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();

  const [rewards, setRewards] = useState<RewardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states for Add/Edit
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentReward, setCurrentReward] = useState<Partial<RewardDefinition>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<RewardDefinition | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  const fetchRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRewards(data as RewardDefinition[] || []);
    } catch (err: any) {
      console.error("Error fetching reward definitions:", err);
      setError(err.message || "Failed to fetch rewards.");
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
      fetchRewards();
    }
  }, [adminUser, adminAuthLoading, router]);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setCurrentReward({
      name: '',
      description: '',
      pgc_amount: 0,
      criteria_plastic_kg: null,
      criteria_petgas_liters: null,
    });
    setFormError(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (reward: RewardDefinition) => {
    setIsEditMode(true);
    setCurrentReward({...reward});
    setFormError(null);
    setShowFormModal(true);
  };
  
  const handleCloseModal = () => {
    setShowFormModal(false);
    setCurrentReward({});
    setFormError(null);
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numValue = (name === 'pgc_amount' || name === 'criteria_plastic_kg' || name === 'criteria_petgas_liters') 
                     ? (value === '' ? null : parseFloat(value)) 
                     : value;
    setCurrentReward(prev => ({ ...prev, [name]: numValue }));
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!currentReward.name || currentReward.pgc_amount === undefined || currentReward.pgc_amount <=0) {
        setFormError("Reward Name and a PGC Amount greater than 0 are required.");
        setFormLoading(false);
        return;
    }
    
    const rewardData = {
        name: currentReward.name,
        description: currentReward.description || null,
        pgc_amount: currentReward.pgc_amount,
        criteria_plastic_kg: currentReward.criteria_plastic_kg || null,
        criteria_petgas_liters: currentReward.criteria_petgas_liters || null,
    };

    try {
      if (isEditMode && currentReward.id) {
        const { error: updateError } = await supabase
          .from('rewards')
          .update(rewardData)
          .eq('id', currentReward.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('rewards')
          .insert(rewardData);
        if (insertError) throw insertError;
      }
      fetchRewards(); // Refresh list
      handleCloseModal();
    } catch (err: any) {
      console.error("Error saving reward:", err);
      setFormError(err.message || "Failed to save reward.");
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleDeleteRequest = (reward: RewardDefinition) => {
    setRewardToDelete(reward);
    setShowDeleteModal(true);
  };

  const confirmDeleteReward = async () => {
    if (!rewardToDelete) return;
    setDeleteLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardToDelete.id);

      if (deleteError) throw deleteError;
      
      setRewards(rewards.filter(r => r.id !== rewardToDelete.id));
      setShowDeleteModal(false);
      setRewardToDelete(null);
    } catch (err: any) {
      console.error("Error deleting reward:", err);
      // Display error in modal or main page
      setError(err.message || "Failed to delete reward. It might be in use.");
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
        Loading reward definitions...
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-400 p-10">Error: {error}</p>;
  }

  return (
    <>
      <Head>
        <title>Manage Reward Definitions | Petgas Admin</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400 mb-4 sm:mb-0">
            Reward Definitions
          </h1>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 text-sm rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Add New Reward
          </button>
        </div>

        {rewards.length === 0 ? (
          <p className="text-center text-gray-400">No reward definitions found. Add one to get started!</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">PGC Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Plastic (kg)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Petgas (L)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-gray-650 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{reward.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-semibold">{reward.pgc_amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate" title={reward.description || ''}>{reward.description || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{reward.criteria_plastic_kg ?? 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{reward.criteria_petgas_liters ?? 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => handleOpenEditModal(reward)} className="text-yellow-400 hover:text-yellow-300">Edit</button>
                      <button onClick={() => handleDeleteRequest(reward)} className="text-red-500 hover:text-red-400">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Reward Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h3 className="text-xl font-semibold text-white mb-6">{isEditMode ? 'Edit Reward Definition' : 'Add New Reward Definition'}</h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Reward Name <span className="text-red-400">*</span></label>
                <input type="text" name="name" id="name" value={currentReward.name || ''} onChange={handleFormChange} required
                       className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"/>
              </div>
              <div>
                <label htmlFor="pgc_amount" className="block text-sm font-medium text-gray-300">PGC Amount <span className="text-red-400">*</span></label>
                <input type="number" name="pgc_amount" id="pgc_amount" value={currentReward.pgc_amount || 0} onChange={handleFormChange} required min="0.01" step="0.01"
                       className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"/>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                <textarea name="description" id="description" value={currentReward.description || ''} onChange={handleFormChange} rows={3}
                          className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"/>
              </div>
              <div>
                <label htmlFor="criteria_plastic_kg" className="block text-sm font-medium text-gray-300">Criteria: Plastic Mitigated (kg)</label>
                <input type="number" name="criteria_plastic_kg" id="criteria_plastic_kg" value={currentReward.criteria_plastic_kg ?? ''} onChange={handleFormChange} min="0" step="0.01"
                       className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3" placeholder="Optional"/>
              </div>
              <div>
                <label htmlFor="criteria_petgas_liters" className="block text-sm font-medium text-gray-300">Criteria: Petgas Consumed (Liters)</label>
                <input type="number" name="criteria_petgas_liters" id="criteria_petgas_liters" value={currentReward.criteria_petgas_liters ?? ''} onChange={handleFormChange} min="0" step="0.01"
                       className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3" placeholder="Optional"/>
              </div>
              
              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={handleCloseModal} disabled={formLoading}
                        className="px-4 py-2 text-sm rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                        className="px-4 py-2 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                  {formLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add Reward')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Reward Modal */}
      {showDeleteModal && rewardToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the reward <span className="font-bold">{rewardToDelete.name}</span>? 
              This action cannot be undone. Existing client rewards will refer to a deleted reward.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
                      className="px-4 py-2 text-sm rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={confirmDeleteReward} disabled={deleteLoading}
                      className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">
                {deleteLoading ? 'Deleting...' : 'Delete Reward'}
              </button>
            </div>
             {error && <p className="text-red-400 text-sm mt-4">{error}</p>} {/* Show main error if it's related to delete */}
          </div>
        </div>
      )}
    </>
  );
}

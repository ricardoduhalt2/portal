"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ClientProfile } from '@/lib/AuthContext'; // Re-use client profile type
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useAdminAuth } from '@/lib/AdminAuthContext';

// Define interfaces for the data, similar to client dashboard
interface MitigationEntry {
  id: string;
  created_at: string;
  mitigated_plastic_kg: number;
  mitigation_activity_images: { image_url: string }[];
}

interface ConsumptionEntry {
  id: string;
  created_at: string;
  liters_consumed: number;
  transaction_date: string; // Assuming this is how it's stored
}

interface ObtainedReward {
  id: string; // client_rewards.id
  awarded_at: string;
  notes: string | null;
  rewards: { // Joined from rewards table
    id: string; // rewards.id
    name: string;
    description: string | null;
    pgc_amount: number;
  };
}

export default function ViewClientDetailsPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = params?.clientId as string;

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [mitigationHistory, setMitigationHistory] = useState<MitigationEntry[]>([]);
  const [consumptionHistory, setConsumptionHistory] = useState<ConsumptionEntry[]>([]);
  const [obtainedRewards, setObtainedRewards] = useState<ObtainedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Revoke state
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [clientRewardToRevoke, setClientRewardToRevoke] = useState<ObtainedReward | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);


  const fetchAllClientData = async () => {
    if (!clientId) return; 
    setLoading(true);
    setError(null);
    try {
      // Fetch Client Profile
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (clientError) throw new Error(`Fetching client profile: ${clientError.message}`);
      if (!clientData) throw new Error("Client not found.");
      setClient(clientData as ClientProfile);

      // Fetch Mitigation History
      const { data: mitigationData, error: mitigationError } = await supabase
        .from('plastic_mitigation_entries')
        .select('id, created_at, mitigated_plastic_kg, mitigation_activity_images(image_url)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (mitigationError) throw new Error(`Fetching mitigation data: ${mitigationError.message}`);
      setMitigationHistory(mitigationData as MitigationEntry[] || []);

      // Fetch Consumption History
      const { data: consumptionData, error: consumptionError } = await supabase
        .from('petgas_consumption_entries')
        .select('id, created_at, liters_consumed, transaction_date')
        .eq('client_id', clientId)
        .order('transaction_date', { ascending: false });
      if (consumptionError) throw new Error(`Fetching consumption data: ${consumptionError.message}`);
      setConsumptionHistory(consumptionData as ConsumptionEntry[] || []);
      
      // Fetch Obtained Rewards
      const { data: clientRewardsData, error: clientRewardsError } = await supabase
        .from('client_rewards')
        .select('id, awarded_at, notes, rewards(id, name, description, pgc_amount)') // Ensure reward 'id' and 'pgc_amount' are fetched
        .eq('client_id', clientId)
        .order('awarded_at', { ascending: false });
      if (clientRewardsError) throw new Error(`Fetching obtained rewards: ${clientRewardsError.message}`);
      setObtainedRewards(clientRewardsData as ObtainedReward[] || []);

    } catch (err: any) {
      console.error("Error fetching client details:", err);
      setError(err.message || "Failed to load client details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminAuthLoading && !adminUser) {
      router.replace('/admin/login');
      return;
    }
    if (adminUser && clientId) {
      fetchAllClientData();
    }
  }, [adminUser, adminAuthLoading, clientId, router]); // fetchAllClientData removed from dep array for this pattern

  const handleRevokeRequest = (reward: ObtainedReward) => {
    setClientRewardToRevoke(reward);
    setRevokeError(null); 
    setShowRevokeModal(true);
  };

  const confirmRevokeReward = async () => {
    if (!clientRewardToRevoke || !client) return;
    setRevokeLoading(true);
    setRevokeError(null);

    try {
      // 1. Delete from client_rewards
      const { error: deleteError } = await supabase
        .from('client_rewards')
        .delete()
        .eq('id', clientRewardToRevoke.id); // client_rewards.id
      if (deleteError) throw new Error(`Deleting client_reward entry: ${deleteError.message}`);

      // 2. Decrement client's PGC balance
      const pgcAmountToDecrement = clientRewardToRevoke.rewards.pgc_amount;
      const currentPgcBalance = client.pgc_balance || 0;
      const newPgcBalance = Math.max(0, currentPgcBalance - pgcAmountToDecrement);

      const { data: updatedClient, error: updateBalanceError } = await supabase
        .from('clients')
        .update({ pgc_balance: newPgcBalance, updated_at: new Date().toISOString() })
        .eq('id', client.id)
        .select() 
        .single();
      
      if (updateBalanceError) {
        console.error("CRITICAL: Reward entry deleted but failed to update PGC balance.", updateBalanceError);
        throw new Error(`Updating PGC balance failed: ${updateBalanceError.message}. Manual PGC adjustment for client ${client.email} might be needed.`);
      }
      
      setClient(updatedClient as ClientProfile); 
      setObtainedRewards(prev => prev.filter(r => r.id !== clientRewardToRevoke.id)); 
      setShowRevokeModal(false);
      setClientRewardToRevoke(null);

    } catch (err: any) {
      console.error("Error revoking reward:", err);
      setRevokeError(err.message || "Failed to revoke reward.");
    } finally {
      setRevokeLoading(false);
    }
  };

  if (loading || adminAuthLoading) {
     return (
      <div className="flex items-center justify-center p-10 text-gray-300">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading client details and activity...
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-400 p-10">Error: {error}</p>;
  }
  
  if (!client) {
    return <p className="text-center text-gray-400 p-10">Client data not found.</p>;
  }

  return (
    <>
      <Head>
        <title>View Client: {client.full_name || client.email} | Petgas Admin</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400">
              {client.full_name || 'Client Details'}
            </h1>
            <p className="text-gray-400 text-sm">{client.email}</p>
          </div>
          <div className="mt-3 sm:mt-0">
            <Link href="/admin/clients" legacyBehavior>
              <a className="text-sm text-indigo-400 hover:text-indigo-300 mr-4">&larr; Back to Client List</a>
            </Link>
            <Link href={`/admin/clients/edit/${client.id}`} legacyBehavior>
              <a className="inline-block rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                Edit Client
              </a>
            </Link>
          </div>
        </div>

        {/* Client Profile Info */}
        <section className="mb-8 bg-gray-750 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-indigo-300 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div><strong className="text-gray-400">Client ID:</strong> <span className="text-gray-200">{client.id}</span></div>
            <div><strong className="text-gray-400">Full Name:</strong> <span className="text-gray-200">{client.full_name || 'N/A'}</span></div>
            <div><strong className="text-gray-400">Email:</strong> <span className="text-gray-200">{client.email}</span></div>
            <div><strong className="text-gray-400">PGC Balance:</strong> <span className="text-green-400 font-semibold">{client.pgc_balance?.toFixed(2) || '0.00'} PGC</span></div>
            <div><strong className="text-gray-400">Solana Wallet:</strong> <span className="text-gray-200">{client.solana_wallet || 'N/A'}</span></div>
            <div><strong className="text-gray-400">BNB Wallet:</strong> <span className="text-gray-200">{client.bnb_wallet || 'N/A'}</span></div>
            <div><strong className="text-gray-400">Registered On:</strong> <span className="text-gray-200">{client.created_at ? new Date(client.created_at).toLocaleString() : 'N/A'}</span></div>
            <div><strong className="text-gray-400">Last Updated:</strong> <span className="text-gray-200">{client.updated_at ? new Date(client.updated_at).toLocaleString() : 'N/A'}</span></div>
          </div>
        </section>

        {/* Mitigation History */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-indigo-300 mb-4">Plastic Mitigation History</h2>
          {mitigationHistory.length > 0 ? (
            <div className="space-y-4">
              {mitigationHistory.map(entry => (
                <div key={entry.id} className="bg-gray-750 p-4 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-200">{entry.mitigated_plastic_kg.toFixed(2)} kg</p>
                    <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                  {entry.mitigation_activity_images && entry.mitigation_activity_images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.mitigation_activity_images.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded overflow-hidden cursor-pointer" onClick={() => setSelectedImage(img.image_url)}>
                          <Image src={img.image_url} alt={`Mitigation ${idx+1}`} layout="fill" objectFit="cover" className="hover:opacity-75"/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No plastic mitigation activities recorded.</p>}
        </section>

        {/* Petgas Consumption History */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-indigo-300 mb-4">Petgas Consumption History</h2>
          {consumptionHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Liters Consumed</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Transaction Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-indigo-300 uppercase tracking-wider">Logged At</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-750 divide-y divide-gray-700">
                        {consumptionHistory.map(entry => (
                        <tr key={entry.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">{entry.liters_consumed.toFixed(2)} L</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{new Date(entry.transaction_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{new Date(entry.created_at).toLocaleString()}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          ) : <p className="text-gray-400 text-sm">No Petgas consumption activities recorded.</p>}
        </section>

        {/* Obtained Rewards */}
        <section>
          <h2 className="text-xl font-semibold text-indigo-300 mb-4">Earned Rewards</h2>
          {obtainedRewards.length > 0 ? (
             <div className="space-y-3">
                {obtainedRewards.map(or => (
                    <div key={or.id} className="bg-gray-750 p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-green-400">{or.rewards.name} (+{or.rewards.pgc_amount} PGC)</h3>
                                <p className="text-xs text-gray-400 mt-1">Awarded: {new Date(or.awarded_at).toLocaleString()}</p>
                                {or.rewards.description && <p className="text-sm text-gray-300 mt-1">{or.rewards.description}</p>}
                                {or.notes && <p className="text-xs text-gray-500 italic mt-1">Notes: {or.notes}</p>}
                            </div>
                            <button 
                                onClick={() => handleRevokeRequest(or)}
                                disabled={revokeLoading && clientRewardToRevoke?.id === or.id}
                                className="ml-4 px-3 py-1 text-xs rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {revokeLoading && clientRewardToRevoke?.id === or.id ? 'Revoking...' : 'Revoke'}
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          ) : <p className="text-gray-400 text-sm">No rewards earned by this client yet.</p>}
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

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && clientRewardToRevoke && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Reward Revocation</h3>
            <p className="text-gray-300 mb-2">
              Are you sure you want to revoke the reward <span className="font-bold text-indigo-300">{clientRewardToRevoke.rewards.name}</span> for client <span className="font-bold text-indigo-300">{client?.full_name || client?.email}</span>?
            </p>
            <p className="text-gray-400 text-sm mb-6">
              This will remove the reward entry and deduct <span className="font-bold text-yellow-400">{clientRewardToRevoke.rewards.pgc_amount} PGC</span> from the client's balance. This action cannot be easily undone.
            </p>
            
            {revokeError && <p className="text-red-400 text-sm mb-4 bg-red-900/50 p-3 rounded-md">Error: {revokeError}</p>}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRevokeModal(false)}
                disabled={revokeLoading}
                className="px-4 py-2 text-sm rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevokeReward}
                disabled={revokeLoading}
                className="px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {revokeLoading ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

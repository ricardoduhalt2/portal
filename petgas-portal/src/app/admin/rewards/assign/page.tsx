"use client";

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';
import { useAdminAuth } from '@/lib/AdminAuthContext';
import { useRouter } from 'next/navigation';
import Select from 'react-select'; // Using react-select for better UX

interface ClientOption {
  value: string; // client.id
  label: string; // client.full_name or client.email
  current_pgc_balance: number;
}

interface RewardOption {
  value: string; // reward.id
  label: string; // reward.name
  pgc_amount: number;
}

export default function AssignRewardPage() {
  const { adminUser, loading: adminAuthLoading } = useAdminAuth();
  const router = useRouter();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [rewards, setRewards] = useState<RewardOption[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [selectedReward, setSelectedReward] = useState<RewardOption | null>(null);
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true); // For initial data load (clients, rewards)
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!adminAuthLoading && !adminUser) {
      router.replace('/admin/login');
      return;
    }
    if (adminUser) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, full_name, email, pgc_balance');
          if (clientError) throw new Error(`Fetching clients: ${clientError.message}`);
          setClients(clientData?.map(c => ({ 
            value: c.id, 
            label: `${c.full_name || 'N/A'} (${c.email})`,
            current_pgc_balance: c.pgc_balance || 0
          })) || []);

          const { data: rewardData, error: rewardError } = await supabase
            .from('rewards')
            .select('id, name, pgc_amount');
          if (rewardError) throw new Error(`Fetching rewards: ${rewardError.message}`);
          setRewards(rewardData?.map(r => ({ 
            value: r.id, 
            label: `${r.name} (+${r.pgc_amount} PGC)`,
            pgc_amount: r.pgc_amount
          })) || []);

        } catch (err: any) {
          console.error("Error fetching data for assignment:", err);
          setError(err.message || "Failed to load data.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [adminUser, adminAuthLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient || !selectedReward) {
      setError("Please select a client and a reward.");
      return;
    }
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Create client_rewards entry
      const { error: clientRewardError } = await supabase
        .from('client_rewards')
        .insert({
          client_id: selectedClient.value,
          reward_id: selectedReward.value,
          notes: notes || null,
          awarded_at: new Date().toISOString(),
        });
      if (clientRewardError) throw new Error(`Assigning reward: ${clientRewardError.message}`);

      // 2. Update client's PGC balance
      // Best to use an RPC function for this if available, for atomicity.
      // supabase.rpc('increment_pgc_balance', { client_id_in: selectedClient.value, amount_in: selectedReward.pgc_amount })
      // Fallback: fetch current, calculate, then update (less safe for concurrency)
      const newPgcBalance = (selectedClient.current_pgc_balance || 0) + selectedReward.pgc_amount;
      const { error: updateBalanceError } = await supabase
        .from('clients')
        .update({ pgc_balance: newPgcBalance, updated_at: new Date().toISOString() })
        .eq('id', selectedClient.value);
      
      if (updateBalanceError) {
        // Attempt to rollback or notify admin of inconsistency
        console.error("Failed to update PGC balance. Client reward was logged, but balance not updated.", updateBalanceError);
        // Consider deleting the client_rewards entry here or marking it as needing attention
        throw new Error(`Updating PGC balance: ${updateBalanceError.message}. Please manually verify client balance.`);
      }

      setSuccessMessage(`Successfully awarded "${selectedReward.label}" to ${selectedClient.label}. Their PGC balance has been updated.`);
      setSelectedClient(null);
      setSelectedReward(null);
      setNotes('');
      // Optionally, refresh client list data if PGC balances are shown there or needed for subsequent operations.
      // For now, the local `clients` state for the dropdown isn't updated post-assignment to reflect new balance.
      // A full page refresh or re-fetch of clients would be needed for that.

    } catch (err: any) {
      console.error("Error in reward assignment process:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setFormLoading(false);
    }
  };
  
  const selectStyles = {
    control: (styles: any) => ({ ...styles, backgroundColor: '#374151', borderColor: '#4B5563', color: 'white' }), // bg-gray-700, border-gray-600
    menu: (styles: any) => ({ ...styles, backgroundColor: '#374151' }), // bg-gray-700
    option: (styles: any, { isFocused, isSelected }: any) => ({
      ...styles,
      backgroundColor: isSelected ? '#4F46E5' : isFocused ? '#4B5563' : undefined, // selected: bg-indigo-600, focused: bg-gray-600
      color: 'white',
      ':active': {
        ...styles[':active'],
        backgroundColor: !isSelected ? '#4338CA' : undefined, // active: bg-indigo-700
      },
    }),
    singleValue: (styles: any) => ({ ...styles, color: 'white' }),
    input: (styles: any) => ({ ...styles, color: 'white' }),
    placeholder: (styles: any) => ({...styles, color: '#9CA3AF'}) // placeholder-gray-400
  };


  if (adminAuthLoading || loading) {
    return (
      <div className="flex items-center justify-center p-10 text-gray-300">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading data for reward assignment...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Assign Reward to Client | Petgas Admin</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400 mb-8">
          Assign Reward to Client
        </h1>

        {error && <p className="mb-4 text-sm text-red-400 bg-red-900/50 p-3 rounded-md">Error: {error}</p>}
        {successMessage && <p className="mb-4 text-sm text-green-400 bg-green-900/50 p-3 rounded-md">{successMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-300 mb-1">
              Select Client <span className="text-red-400">*</span>
            </label>
            <Select
              id="client_id"
              name="client_id"
              options={clients}
              value={selectedClient}
              onChange={(option) => setSelectedClient(option as ClientOption)}
              isLoading={loading}
              isClearable
              placeholder="Search and select a client..."
              styles={selectStyles}
              classNamePrefix="react-select"
            />
          </div>

          <div>
            <label htmlFor="reward_id" className="block text-sm font-medium text-gray-300 mb-1">
              Select Reward <span className="text-red-400">*</span>
            </label>
            <Select
              id="reward_id"
              name="reward_id"
              options={rewards}
              value={selectedReward}
              onChange={(option) => setSelectedReward(option as RewardOption)}
              isLoading={loading}
              isClearable
              placeholder="Search and select a reward..."
              styles={selectStyles}
              classNamePrefix="react-select"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
              placeholder="E.g., Special campaign, manual adjustment, etc."
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={formLoading || !selectedClient || !selectedReward}
              className="px-6 py-2.5 text-sm rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {formLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Assigning...
                </>
              ) : 'Assign Reward'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

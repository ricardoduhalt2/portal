"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';
import Image from 'next/image'; // For mitigation images
import { useRouter } from 'next/navigation';

// Define interfaces for the data
interface MitigationEntry {
  id: string;
  created_at: string;
  mitigated_plastic_kg: number;
  mitigation_activity_images: { image_url: string }[];
}

interface ConsumptionEntry { // Not displaying detailed history for now, but good for totals
  liters_consumed: number;
}

interface ObtainedReward {
  id: string;
  awarded_at: string;
  notes: string | null;
  rewards: { // Joined from rewards table
    name: string;
    description: string | null;
    pgc_amount: number;
    criteria_plastic_kg: number | null;
    criteria_petgas_liters: number | null;
  };
}

interface AvailableReward { // From rewards table directly
    id: string;
    name: string;
    description: string | null;
    pgc_amount: number;
    criteria_plastic_kg: number | null;
    criteria_petgas_liters: number | null;
}


export default function DashboardPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [totalMitigatedPlastic, setTotalMitigatedPlastic] = useState<number>(0);
  const [mitigationHistory, setMitigationHistory] = useState<MitigationEntry[]>([]);
  const [totalPetgasConsumed, setTotalPetgasConsumed] = useState<number>(0);
  const [obtainedRewards, setObtainedRewards] = useState<ObtainedReward[]>([]);
  const [availableRewards, setAvailableRewards] = useState<AvailableReward[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Image modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && profile) { // Ensure user and profile are loaded
      setDashboardLoading(true);
      setError(null);

      const fetchData = async () => {
        try {
          // 1. Refresh profile to get latest PGC balance (already in `profile.pgc_balance`)
          // No specific call here as profile is from context, but ensure it's fresh if needed
          // await refreshProfile(); // Call if you suspect PGC balance might be stale and not updated by other operations

          // 2. Total Mitigated Plastic & History
          const { data: mitigationData, error: mitigationError } = await supabase
            .from('plastic_mitigation_entries')
            .select('id, created_at, mitigated_plastic_kg, mitigation_activity_images(image_url)')
            .eq('client_id', user.id)
            .order('created_at', { ascending: false });

          if (mitigationError) throw new Error(`Fetching mitigation data: ${mitigationError.message}`);
          
          let totalPlastic = 0;
          mitigationData?.forEach(entry => {
            totalPlastic += entry.mitigated_plastic_kg;
          });
          setTotalMitigatedPlastic(totalPlastic);
          setMitigationHistory(mitigationData as MitigationEntry[] || []);

          // 3. Total Petgas Consumed
          const { data: consumptionData, error: consumptionError } = await supabase
            .from('petgas_consumption_entries')
            .select('liters_consumed')
            .eq('client_id', user.id);

          if (consumptionError) throw new Error(`Fetching consumption data: ${consumptionError.message}`);

          let totalConsumed = 0;
          consumptionData?.forEach(entry => {
            totalConsumed += entry.liters_consumed;
          });
          setTotalPetgasConsumed(totalConsumed);

          // 4. Obtained Rewards
          const { data: clientRewardsData, error: clientRewardsError } = await supabase
            .from('client_rewards')
            .select('id, awarded_at, notes, rewards(name, description, pgc_amount, criteria_plastic_kg, criteria_petgas_liters)')
            .eq('client_id', user.id)
            .order('awarded_at', { ascending: false });

          if (clientRewardsError) throw new Error(`Fetching obtained rewards: ${clientRewardsError.message}`);
          setObtainedRewards(clientRewardsData as ObtainedReward[] || []);
          
          // 5. (Optional Bonus) Available Rewards
          const { data: allRewardsData, error: allRewardsError } = await supabase
            .from('rewards')
            .select('*');
          
          if (allRewardsError) throw new Error(`Fetching all rewards: ${allRewardsError.message}`);

          const obtainedRewardIds = new Set(clientRewardsData?.map(cr => cr.rewards.name)); // Assuming name is unique for simplicity, ideally use ID
          const unearnedRewards = allRewardsData?.filter(r => !obtainedRewardIds.has(r.name)) || [];
          setAvailableRewards(unearnedRewards as AvailableReward[]);


        } catch (err: any) {
          console.error("Dashboard data fetching error:", err);
          setError(err.message || "Failed to load dashboard data.");
        } finally {
          setDashboardLoading(false);
        }
      };

      fetchData();
    } else if (!authLoading && !user) {
        // If not loading and no user, the layout should redirect.
        // Setting dashboard loading to false here prevents showing loader if redirecting.
        setDashboardLoading(false);
    }
  }, [user, profile, authLoading, refreshProfile]); // refreshProfile added if used

  if (authLoading || dashboardLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 animate-spin text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="text-gray-700 mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()} // Simple reload, or could trigger refetch
            className="mt-4 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    // Should be handled by layout redirect, but good to have a fallback.
    return <div className="flex min-h-screen items-center justify-center"><p>Redirecting to login...</p></div>;
  }

  const StatCard: React.FC<{ title: string; value: string | number; unit?: string; colorClass?: string }> = ({ title, value, unit, colorClass = "bg-[var(--petgas-green-primary)]" }) => (
    <div className={`p-6 rounded-xl shadow-lg text-[var(--petgas-white)] ${colorClass}`}>
      <h3 className="text-lg font-semibold text-white/90">{title}</h3>
      <p className="text-3xl font-bold">
        {value} <span className="text-xl font-medium">{unit}</span>
      </p>
    </div>
  );

  return (
    <>
      <Head>
        <title>Dashboard | Petgas Client Portal</title>
      </Head>
      {/* The main div's background is inherited from ClientLayout (bg-[var(--petgas-gray-light)]) */}
      {/* py-8 px-4 sm:px-6 lg:px-8 are from ClientLayout's main content area, so no need to repeat unless specific adjustments needed */}
      <div className="container mx-auto"> {/* This container is already in ClientLayout's <main> */}
          <h1 className="text-3xl font-bold tracking-tight text-[var(--heading-color)] mb-8">
            Welcome, {profile.full_name || profile.email}!
          </h1>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <StatCard title="PGC Balance" value={profile.pgc_balance !== null && profile.pgc_balance !== undefined ? profile.pgc_balance.toFixed(2) : '0.00'} unit="PGC" colorClass="bg-[var(--petgas-green-primary)]" />
            <StatCard title="Total Plastic Mitigated" value={totalMitigatedPlastic.toFixed(2)} unit="kg" colorClass="bg-[var(--petgas-blue-primary)]" />
            <StatCard title="Total Petgas Consumed" value={totalPetgasConsumed.toFixed(2)} unit="Liters" colorClass="bg-[var(--petgas-green-dark)]" />
          </div>

          {/* Mitigation Activity History */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-[var(--petgas-green-dark)] mb-6">Plastic Mitigation History</h2>
            {mitigationHistory.length > 0 ? (
              <div className="space-y-6">
                {mitigationHistory.slice(0, 5).map((entry) => ( 
                  <div key={entry.id} className="bg-[var(--petgas-white)] p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                      <p className="text-lg font-medium text-[var(--text-color)]">
                        {entry.mitigated_plastic_kg.toFixed(2)} kg mitigated
                      </p>
                      <p className="text-sm text-[var(--text-color-muted)]">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {entry.mitigation_activity_images && entry.mitigation_activity_images.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-[var(--text-color-muted)] mb-2">Evidence:</h4>
                        <div className="flex flex-wrap gap-3">
                          {entry.mitigation_activity_images.map((img, index) => (
                            <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden cursor-pointer group" onClick={() => setSelectedImage(img.image_url)}>
                              <Image src={img.image_url} alt={`Mitigation evidence ${index + 1}`} layout="fill" objectFit="cover" className="group-hover:opacity-80 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {mitigationHistory.length > 5 && (
                    <p className="text-center text-[var(--text-color-muted)] mt-4">Showing latest 5 entries. Full history view coming soon.</p>
                )}
              </div>
            ) : (
              <p className="text-[var(--text-color-muted)] bg-[var(--petgas-white)] p-6 rounded-lg shadow text-center">No plastic mitigation activities logged yet.</p>
            )}
          </section>

          {/* Rewards Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section>
              <h2 className="text-2xl font-semibold text-[var(--petgas-green-dark)] mb-6">Your Earned Rewards</h2>
              {obtainedRewards.length > 0 ? (
                <div className="space-y-4">
                  {obtainedRewards.map((or) => (
                    <div key={or.id} className="bg-[var(--petgas-white)] p-5 rounded-lg shadow-md">
                      <h3 className="text-lg font-bold text-[var(--petgas-green-primary)]">{or.rewards.name}</h3>
                      <p className="text-sm text-[var(--text-color-muted)] mt-1">{or.rewards.description || 'No description available.'}</p>
                      <p className="text-md font-semibold text-[var(--text-color)] mt-2">+{or.rewards.pgc_amount} PGC</p>
                      <p className="text-xs text-[var(--text-color-muted)] mt-1">Awarded on: {new Date(or.awarded_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-color-muted)] bg-[var(--petgas-white)] p-6 rounded-lg shadow text-center">You haven't earned any rewards yet.</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-[var(--petgas-green-dark)] mb-6">Available Rewards</h2>
              {availableRewards.length > 0 ? (
                <div className="space-y-4">
                  {availableRewards.map((ar) => (
                    <div key={ar.id} className="bg-[var(--petgas-white)] p-5 rounded-lg shadow-md border border-dashed border-[var(--input-border-color)]">
                      <h3 className="text-lg font-bold text-[var(--petgas-blue-primary)]">{ar.name}</h3>
                      <p className="text-sm text-[var(--text-color-muted)] mt-1">{ar.description || 'No description available.'}</p>
                      <p className="text-md font-semibold text-[var(--text-color)] mt-2">Earn: {ar.pgc_amount} PGC</p>
                      <div className="text-xs text-[var(--text-color-muted)] mt-1 space-y-0.5">
                        {ar.criteria_plastic_kg && <p>Mitigate {ar.criteria_plastic_kg} kg of plastic</p>}
                        {ar.criteria_petgas_liters && <p>Consume {ar.criteria_petgas_liters} L of Petgas</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-color-muted)] bg-[var(--petgas-white)] p-6 rounded-lg shadow text-center">No new rewards currently available.</p>
              )}
            </section>
          </div>
          
          {/* Image Modal */}
          {selectedImage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4" // Increased z-index
              onClick={() => setSelectedImage(null)} 
            >
              <div className="relative max-w-3xl max-h-[80vh] bg-[var(--petgas-white)] p-2 rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setSelectedImage(null)} 
                    className="absolute -top-3 -right-3 bg-[var(--petgas-blue-primary)] text-white rounded-full p-1.5 text-xl leading-none z-10 hover:bg-blue-700"
                    aria-label="Close image viewer"
                >
                    &times;
                </button>
                <Image src={selectedImage} alt="Enlarged mitigation evidence" width={800} height={600} objectFit="contain" className="rounded" />
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

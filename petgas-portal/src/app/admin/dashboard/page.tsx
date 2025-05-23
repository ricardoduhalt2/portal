"use client";

import { useAdminAuth } from '@/lib/AdminAuthContext';
import Head from 'next/head';
import Link from 'next/link'; // For future links

export default function AdminDashboardPage() {
  const { adminUser, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-3 text-lg text-gray-300">Loading dashboard...</p>
      </div>
    );
  }

  if (!adminUser) {
    // This should ideally be handled by the layout redirect,
    // but as a fallback:
    return <p className="text-center text-red-400 p-10">Access Denied. Please log in.</p>;
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard | Petgas Portal</title>
      </Head>
      <div className="bg-gray-800 shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-400 mb-6">
          Admin Dashboard
        </h1>
        <p className="text-lg text-gray-300 mb-4">
          Welcome, <span className="font-semibold">{adminUser.email}</span>!
        </p>
        <p className="text-gray-400 mb-6">
          This is the central hub for managing Petgas client activities and platform settings.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-3">Client Management</h2>
            <p className="text-gray-400 mb-4">
              View, search, and manage client accounts, balances, and activities.
            </p>
            <Link href="/admin/clients" legacyBehavior>
              <a className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                Manage Clients
              </a>
            </Link>
          </div>
          <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-3">Reward Definitions</h2>
            <p className="text-gray-400 mb-4">
              Define and manage the types of rewards available.
            </p>
            <Link href="/admin/rewards/definitions" legacyBehavior>
              <a className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                Manage Definitions
              </a>
            </Link>
          </div>
          <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-3">Assign Rewards</h2>
            <p className="text-gray-400 mb-4">
              Manually assign rewards to specific clients.
            </p>
            <Link href="/admin/rewards/assign" legacyBehavior>
              <a className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                Assign Rewards
              </a>
            </Link>
          </div>
           <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-3">Mitigation Entries</h2>
            <p className="text-gray-400 mb-4">
              View, approve, or reject client-submitted plastic mitigation data.
            </p>
            <Link href="/admin/data/mitigation-entries" legacyBehavior>
              <a className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                Manage Mitigation Data
              </a>
            </Link>
          </div>
          <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-indigo-300 mb-3">Consumption Entries</h2>
            <p className="text-gray-400 mb-4">
              View and manage client-submitted Petgas consumption data.
            </p>
            <Link href="/admin/data/consumption-entries" legacyBehavior>
              <a className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800">
                Manage Consumption Data
              </a>
            </Link>
          </div>
          {/* More sections can be added later, e.g., Platform Settings, Analytics */}
        </div>
      </div>
    </>
  );
}

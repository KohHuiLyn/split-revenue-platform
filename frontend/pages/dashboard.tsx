import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Loader } from 'lucide-react';

interface Payout {
  id: number;
  projectName: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayouts();
    }
  }, [isAuthenticated]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await api.payouts.getHistory(10, 0);
      setPayouts(response.data.payouts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-12">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {user?.displayName || user?.email}!
          </h1>
          <p className="text-gray-600">
            Manage your projects and track your revenue splits.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link href="/projects">
            <div className="card cursor-pointer hover:shadow-lg transition">
              <h3 className="text-2xl font-bold text-primary mb-2">📊</h3>
              <h4 className="text-lg font-bold mb-1">My Projects</h4>
              <p className="text-gray-600 text-sm">
                View and manage all your projects
              </p>
            </div>
          </Link>

          <Link href="/projects/new">
            <div className="card cursor-pointer hover:shadow-lg transition">
              <h3 className="text-2xl font-bold text-primary mb-2">➕</h3>
              <h4 className="text-lg font-bold mb-1">Create Project</h4>
              <p className="text-gray-600 text-sm">
                Start a new revenue-sharing project
              </p>
            </div>
          </Link>

          <Link href="/wallet-test">
            <div className="card cursor-pointer hover:shadow-lg transition">
              <h3 className="text-2xl font-bold text-primary mb-2">🔑</h3>
              <h4 className="text-lg font-bold mb-1">Wallet Test</h4>
              <p className="text-gray-600 text-sm">
                Test your wallet and request testnet USDC
              </p>
            </div>
          </Link>

          <Link href="/payouts">
            <div className="card cursor-pointer hover:shadow-lg transition">
              <h3 className="text-2xl font-bold text-primary mb-2">💰</h3>
              <h4 className="text-lg font-bold mb-1">Payouts</h4>
              <p className="text-gray-600 text-sm">
                View all payment history and receipts
              </p>
            </div>
          </Link>
        </div>

        {/* Recent Payouts */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">Recent Payouts</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No payouts yet. Create a project to get started!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Project
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{payout.projectName}</td>
                      <td className="py-3 px-4 font-semibold">${payout.amount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            payout.status === 'success'
                              ? 'badge-success'
                              : payout.status === 'pending'
                              ? 'badge-pending'
                              : 'badge-error'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/payouts"
              className="text-primary hover:underline font-medium"
            >
              View all payouts →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

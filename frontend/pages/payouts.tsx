import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Loader, AlertCircle, ExternalLink } from 'lucide-react';

interface Payout {
  id: number;
  projectName: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  onChainTxHash?: string;
  createdAt: string;
}

export default function PayoutsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayouts();
    }
  }, [isAuthenticated]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await api.payouts.getHistory(50, 0);
      setPayouts(response.data.payouts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load payout history');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payout History</h1>
          <p className="text-gray-600 mt-1">All revenue distributions across your projects</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        ) : payouts.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-5xl mb-4">💰</p>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No payouts yet</h2>
            <p className="text-gray-500 mb-6">
              Payouts appear here once a project receives purchases and the batch is executed.
            </p>
            <Link href="/projects">
              <button className="btn-primary">Go to Projects</button>
            </Link>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Project</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tx Hash</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{payout.projectName}</td>
                      <td className="py-3 px-4 font-semibold text-primary">${payout.amount}</td>
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
                      <td className="py-3 px-4">
                        {payout.onChainTxHash ? (
                          <a
                            href={`https://explorer.aptoslabs.com/txn/${payout.onChainTxHash}?network=testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline text-sm font-mono"
                          >
                            {payout.onChainTxHash.substring(0, 10)}...
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

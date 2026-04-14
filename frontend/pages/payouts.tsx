import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f]">
        <Loader className="animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d4ff] to-[#0099ff] bg-clip-text text-transparent mb-2">
            Payout History
          </h1>
          <p className="text-white/60">All revenue distributions across your projects</p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-300/80">{error}</p>
          </motion.div>
        )}

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-24"
          >
            <div className="flex items-center gap-3">
              <Loader className="animate-spin text-[#00d4ff]" size={32} />
              <span className="text-white/60">Loading payouts...</span>
            </div>
          </motion.div>
        ) : payouts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
              <span className="text-5xl">💰</span>
            </div>
            <h2 className="text-xl font-semibold text-white/80 mb-2">No payouts yet</h2>
            <p className="text-white/60 mb-6">
              Payouts appear here once a project receives purchases and the batch is executed.
            </p>
            <Link href="/projects">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold"
              >
                Go to Projects
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 font-semibold text-white/70">Project</th>
                    <th className="text-left py-4 px-6 font-semibold text-white/70">Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-white/70">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-white/70">Tx Hash</th>
                    <th className="text-left py-4 px-6 font-semibold text-white/70">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-medium text-white">{payout.projectName}</td>
                      <td className="py-4 px-6 font-semibold text-[#00d4ff]">${payout.amount}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            payout.status === 'success'
                              ? 'bg-green-500/20 text-green-300'
                              : payout.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {payout.onChainTxHash ? (
                          <a
                            href={`https://explorer.aptoslabs.com/txn/${payout.onChainTxHash}?network=testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#00d4ff] hover:underline text-sm font-mono"
                          >
                            {payout.onChainTxHash.substring(0, 10)}...
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-white/30 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-white/60 text-sm">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  Plus,
  TrendingUp,
  Users,
  Wallet,
  ArrowUpRight,
  Clock,
  Loader,
  DollarSign,
  FolderKanban,
} from 'lucide-react';

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
      setError('');
      const response = await api.payouts.getHistory(10, 0);
      setPayouts(response.data.payouts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalPayouts = payouts
      .filter((p) => p.status === 'success')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pendingPayouts = payouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const uniqueProjects = new Set(payouts.map((p) => p.projectName)).size;

    return {
      totalPayouts,
      pendingPayouts,
      uniqueProjects,
    };
  }, [payouts]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e27] text-white">
        <Loader className="animate-spin w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00d4ff] opacity-5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ff6b4a] opacity-5 blur-[120px] rounded-full" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">
              Welcome, {user?.displayName}
            </h1>
            <p className="text-white/60">
              Manage your revenue vaults and track your payouts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/wallet-test"
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-medium text-center"
            >
              Wallet Test
            </Link>

            <Link
              href="/projects/new"
              className="group px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)]"
            >
              <Plus className="w-5 h-5" />
              Create New Vault
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Link href="/projects">
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
              <FolderKanban className="w-8 h-8 text-[#00d4ff] mb-3" />
              <h3 className="font-semibold text-lg mb-1">My Projects</h3>
              <p className="text-white/60 text-sm">
                View and manage all your projects
              </p>
            </div>
          </Link>

          <Link href="/projects/new">
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
              <Plus className="w-8 h-8 text-[#00d4ff] mb-3" />
              <h3 className="font-semibold text-lg mb-1">Create Project</h3>
              <p className="text-white/60 text-sm">
                Start a new revenue-sharing vault
              </p>
            </div>
          </Link>

          <Link href="/wallet-test">
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
              <Wallet className="w-8 h-8 text-[#00d4ff] mb-3" />
              <h3 className="font-semibold text-lg mb-1">Wallet Test</h3>
              <p className="text-white/60 text-sm">
                Test wallet flow and request testnet funds
              </p>
            </div>
          </Link>

          <Link href="/payouts">
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer">
              <DollarSign className="w-8 h-8 text-[#00d4ff] mb-3" />
              <h3 className="font-semibold text-lg mb-1">Payouts</h3>
              <p className="text-white/60 text-sm">
                View payment history and receipts
              </p>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#00d4ff]" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Live</span>
              </div>
            </div>
            <div className="text-3xl font-display font-bold mb-1">
              ${stats.totalPayouts.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">Successful Payouts</div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#ff6b4a]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#ff6b4a]" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold mb-1">
              ${stats.pendingPayouts.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm">Pending Payouts</div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#ffd700]/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-[#ffd700]" />
              </div>
            </div>
            <div className="text-3xl font-display font-bold mb-1">
              {stats.uniqueProjects}
            </div>
            <div className="text-white/60 text-sm">Projects with Payouts</div>
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold">Recent Payouts</h2>
            <Link
              href="/payouts"
              className="text-[#00d4ff] hover:text-[#6ee7ff] transition-colors font-medium"
            >
              View all payouts →
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="animate-spin w-6 h-6" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="w-20 h-20 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
                <Wallet className="w-10 h-10 text-white/40" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">No payouts yet</h3>
              <p className="text-white/60 mb-6">
                Create a project and trigger your first revenue split.
              </p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Your First Vault
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="group p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{payout.projectName}</h3>
                      <p className="text-sm text-white/50">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-white/50 text-sm mb-1">Amount</div>
                        <div className="font-display text-xl font-bold text-[#00d4ff]">
                          ${Number(payout.amount).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-white/50 text-sm mb-1">Status</div>
                        <span
                          className={`inline-flex px-3 py-1 rounded-lg text-sm border ${
                            payout.status === 'success'
                              ? 'bg-green-500/10 text-green-300 border-green-500/30'
                              : payout.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
                              : 'bg-red-500/10 text-red-300 border-red-500/30'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </div>

                      <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-[#00d4ff] group-hover:-translate-y-1 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
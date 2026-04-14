'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'motion/react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Wallet,
  Users,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpRight,
  Settings,
  ExternalLink,
  Clock,
  Check,
  DollarSign,
  History,
  Loader,
} from 'lucide-react';

interface Collaborator {
  id: number;
  name: string;
  email: string;
  percentage: number;
  earned: number;
  status: string;
}

interface ProjectData {
  id: number;
  name: string;
  description: string;
  status: string;
  vaultBalance: number;
  totalRevenue: number;
  contractAddress: string;
  network: string;
  lastDistribution: string;
  collaborators: Collaborator[];
  recentTransactions: any[];
  createdAt: string;
}

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;

    const fetchProjectData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.projects.getById(Number(id));
        
        // Transform API response to match UI structure
        const data = response.data;
        setProjectData({
          id: data.id,
          name: data.name,
          description: data.description,
          status: 'active',
          vaultBalance: data.vaultBalance || 0,
          totalRevenue: data.totalRevenue || 0,
          contractAddress: data.contractAddress || '0x742d35Cc6634C0532925a...',
          network: 'Aptos Mainnet',
          lastDistribution: data.lastDistribution || 'N/A',
          collaborators: data.collaborators || [],
          recentTransactions: data.recentTransactions || [],
          createdAt: data.createdAt,
        });
        console.log(JSON.stringify(data))
      } catch (err: any) {
        console.error('Failed to fetch project:', err);
        setError(err.response?.data?.message || 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [id]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#00d4ff]" />
          <p className="text-white/60">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error || 'Failed to load project'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00d4ff] opacity-5 blur-[120px] rounded-full" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#00d4ff]/20 to-[#0099ff]/20 rounded-xl flex items-center justify-center border border-[#00d4ff]/30">
              <svg className="w-8 h-8 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-['Epilogue'] text-4xl font-bold mb-2">{projectData.name}</h1>
              <p className="text-white/60">{projectData.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  Active
                </div>
                <span className="text-sm text-white/50">Created {new Date(projectData.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-gradient-to-br from-[#00d4ff]/10 to-transparent backdrop-blur-sm border border-[#00d4ff]/30 rounded-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#00d4ff]/20 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#00d4ff]" />
              </div>
              <button className="group px-4 py-2 bg-[#00d4ff] hover:bg-[#00e5ff] rounded-lg transition-all font-semibold text-sm flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4" />
                Distribute
              </button>
            </div>
            <div className="text-sm text-white/50 mb-1">Pending Distribution</div>
            <div className="text-3xl font-['Epilogue'] font-bold text-[#00d4ff]">
              ${projectData.vaultBalance.toLocaleString()}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-sm text-white/50 mb-1">Total Revenue</div>
            <div className="text-3xl font-['Epilogue'] font-bold">
              ${projectData.totalRevenue.toLocaleString()}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-sm text-white/50 mb-1">Collaborators</div>
            <div className="text-3xl font-['Epilogue'] font-bold">
              {projectData.collaborators.length}
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              activeTab === 'transactions'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Transactions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Collaborators */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="font-['Epilogue'] text-xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Revenue Split
              </h3>
              <div className="space-y-4">
                {projectData.collaborators.length > 0 ? (
                  projectData.collaborators.map((collab, index) => (
                    <motion.div
                      key={collab.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#00d4ff]/20 to-[#0099ff]/20 rounded-full flex items-center justify-center font-semibold text-[#00d4ff]">
                            {collab.name[0]}
                          </div>
                          <div>
                            <div className="font-semibold">{collab.name}</div>
                            <div className="text-sm text-white/50">{collab.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-['Epilogue'] text-2xl font-bold text-[#00d4ff]">
                            {collab.percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                        <span className="text-white/50">Total Earned</span>
                        <span className="font-semibold">${collab.earned?.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-white/60">No collaborators yet</p>
                )}
              </div>
            </div>

            {/* Vault Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="font-['Epilogue'] text-xl font-bold mb-6">Vault Information</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-sm text-white/50 mb-1">Contract Address</div>
                  <div className="flex items-center justify-between">
                    <code className="text-[#00d4ff] font-mono text-sm break-all">{projectData.contractAddress}</code>
                    <button className="text-white/60 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-sm text-white/50 mb-1">Network</div>
                  <div className="font-semibold">{projectData.network}</div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-sm text-white/50 mb-1">Approval Status</div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-green-400">All collaborators approved</span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-sm text-white/50 mb-1">Last Distribution</div>
                  <div className="font-semibold">{projectData.lastDistribution}</div>
                </div>

                <div className="pt-4">
                  <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-semibold flex items-center justify-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Deposit Funds
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="font-['Epilogue'] text-xl font-bold mb-6 flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </h3>
            <div className="space-y-3">
              {projectData.recentTransactions.length > 0 ? (
                projectData.recentTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.type === 'deposit'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-[#00d4ff]/10 text-[#00d4ff]'
                        }`}>
                          {tx.type === 'deposit' ? (
                            <ArrowDownToLine className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {tx.type === 'deposit' ? 'Deposit' : 'Distribution'}
                            {tx.type === 'deposit' && tx.from && (
                              <span className="text-white/50 text-sm">from {tx.from}</span>
                            )}
                          </div>
                          <div className="text-sm text-white/50">{new Date(tx.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`font-['Epilogue'] text-xl font-bold ${
                            tx.type === 'deposit' ? 'text-green-400' : 'text-white'
                          }`}>
                            {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toLocaleString()}
                          </div>
                          <code className="text-xs text-white/40 font-mono">{tx.txHash}</code>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                    <History className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-white/60">No transactions yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

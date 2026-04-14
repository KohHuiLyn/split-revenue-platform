'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'motion/react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BackgroundEffects } from '@/components/BackgroundEffects';
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
  collaboratorId?: number;
  name: string;
  email: string;
  percentage: number;
  earned: number;
  status: string;
}
interface SplitProposal {
  id: number;
  version: number;
  configData: string | any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  created_by_id?: number;
  totalCollaborators?: number;
  approvalCount?: number;
  approvals?: Array<{ collaborator_id: number; collaborator_name?: string; approved_at: string }>;
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
  pendingSplits?: SplitProposal[];
}

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [distributeError, setDistributeError] = useState('');
  const [distributeSuccess, setDistributeSuccess] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingSplits, setEditingSplits] = useState<{[key: number]: number}>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [pendingSplits, setPendingSplits] = useState<SplitProposal[]>([]);
  const [approvingConfigId, setApprovingConfigId] = useState<number | null>(null);

  useEffect(() => {
    // Don't redirect while auth is still loading (restoring from localStorage)
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, authLoading, router]);
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.projects.getById(Number(id));

        // Transform API response to match UI structure
        const data = response.data;

        // Update collaborators with current split percentages if available
        let collaborators = data.collaborators || [];
        if (data.currentSplitConfig?.config_data) {
          try {
            const configData = typeof data.currentSplitConfig.config_data === 'string'
              ? JSON.parse(data.currentSplitConfig.config_data)
              : data.currentSplitConfig.config_data;

            if (configData.percentages && Array.isArray(configData.percentages)) {
              collaborators = collaborators.map((collab: any, index: number) => ({
                ...collab,
                percentage: configData.percentages[index] || collab.percentage,
              }));
            }
          } catch (e) {
            console.warn('Failed to parse split config:', e);
          }
        }

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
          collaborators: collaborators,
          recentTransactions: data.recentTransactions || [],
          createdAt: data.createdAt,
        });
        console.log(JSON.stringify(data));

        // Fetch split history to find pending proposals
        await fetchSplitHistory(Number(id));
      } catch (err: any) {
        console.error('Failed to fetch project:', err);
        setError(err.response?.data?.message || 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    };

const fetchSplitHistory = async (projectId: number) => {
  try {
    const [historyResponse, currentResponse] = await Promise.all([
      api.splits.getHistory(projectId),
      api.splits.getCurrent(projectId),
    ]);

    const history = historyResponse.data?.history || historyResponse.data || [];
    const current = currentResponse.data || null;

    console.log('Split history response:', history);
    console.log('Current split response:', current);

    // Pending splits are inactive configs that haven't been activated yet
    // They should be newer than the current active split
    let pending: any[] = [];

    if (current?.createdAt) {
      const currentCreatedAt = new Date(current.createdAt).getTime();

      pending = history
        .filter((split: any) => {
          const splitCreatedAt = new Date(split.createdAt).getTime();

          return (
            !split.isActive && // Must be inactive (pending approval)
            split.id &&
            splitCreatedAt > currentCreatedAt
          );
        })
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } else if (history.length > 0) {
      // No current split yet - find any inactive splits
      pending = history
        .filter((split: any) => !split.isActive)
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    setPendingSplits(pending.length > 0 ? [pending[0]] : []);
  } catch (err: any) {
    console.error('Failed to fetch split history:', err);
    setPendingSplits([]);
  }
};
  useEffect(() => {
    if (!id) return;
    fetchProjectData();
  }, [id]);
const handleApprove = async (collaboratorId: number) => {
  if (!id) return;

  try {
    await api.projects.approveCollaborator(Number(id), collaboratorId);

    await fetchProjectData(); // refresh UI
  } catch (err: any) {
    console.error('Approval failed:', err);
  }
};
  const handleDistributeFunds = async () => {
  if (!id) return;

  setDistributeError('');
  setDistributeSuccess('');

  try {
    setDistributeLoading(true);

    const response = await api.payouts.distribute(Number(id));

    setDistributeSuccess(response.data?.message || 'Revenue distributed successfully');

    await fetchProjectData();
  } catch (err: any) {
    console.error('Distribution failed:', err);
    setDistributeError(err.response?.data?.error || 'Failed to distribute funds');
  } finally {
    setDistributeLoading(false);
  }
};
const handleDepositFunds = async () => {
  if (!id) return;

  setDepositError('');
  setDepositSuccess('');

  const parsedAmount = Number(depositAmount);

  if (!parsedAmount || parsedAmount <= 0) {
    setDepositError('Please enter a valid amount');
    return;
  }

  try {
    setDepositLoading(true);

    // Convert USDC to micro-USDC
    const amount_usdc_micro = Math.round(parsedAmount * 1_000_000);

    await api.revenue.depositFunds(Number(id), {
      amount_usdc_micro,
      source: 'Manual Deposit',
    });

    setDepositSuccess('Deposit recorded successfully');
    setDepositAmount('');

    await fetchProjectData();

    setTimeout(() => {
      setDepositOpen(false);
      setDepositSuccess('');
    }, 1000);
  } catch (err: any) {
    console.error('Deposit failed:', err);
    setDepositError(err.response?.data?.error || 'Failed to deposit funds');
  } finally {
    setDepositLoading(false);
  }
};

const handleOpenSettings = () => {
  if (!projectData) return;

  // Initialize edit state with current splits
  const splits: {[key: number]: number} = {};
  projectData.collaborators.forEach(collab => {
    splits[collab.id] = collab.percentage;
  });

  setEditingSplits(splits);
  setSettingsOpen(true);
  setSettingsError('');
  setSettingsSuccess('');
};

const handleProposeSplit = async () => {
  if (!id || !projectData) return;

  setSettingsError('');
  setSettingsSuccess('');

  // Validate that splits add up to 100
  const total = Object.values(editingSplits).reduce((sum, val) => sum + val, 0);
  if (Math.abs(total - 100) > 0.01) {
    setSettingsError(`Splits must total 100%. Current total: ${total.toFixed(2)}%`);
    return;
  }

  // Validate no negative values
  if (Object.values(editingSplits).some(val => val < 0)) {
    setSettingsError('Percentages cannot be negative');
    return;
  }

  try {
    setSettingsLoading(true);
    const collaborators = projectData.collaborators.map(collab => ({
    collaboratorId: collab.collaboratorId || collab.id,
    email: collab.email,
    }));

    const percentages = projectData.collaborators.map(
    collab => editingSplits[collab.id]
    );

    // If there's already a pending split, pass the configId to update it
    const pendingConfigId = pendingSplits.length > 0 && pendingSplits[0] ? pendingSplits[0].id : null;

    await api.splits.propose(Number(id), {
    collaborators,
    percentages,
    configId: pendingConfigId,
    });

    setSettingsSuccess(pendingConfigId ? 'Split proposal updated successfully' : 'Split proposal submitted successfully');

    await fetchProjectData();
    await fetchSplitHistory(Number(id));

    setTimeout(() => {
      setSettingsOpen(false);
      setSettingsSuccess('');
    }, 1000);
  } catch (err: any) {
    console.error('Split proposal failed:', err);
    setSettingsError(err.response?.data?.error || 'Failed to propose split');
  } finally {
    setSettingsLoading(false);
  }
};

const handleSplitChange = (collabId: number, newPercentage: number) => {
  setEditingSplits(prev => ({
    ...prev,
    [collabId]: newPercentage,
  }));
};

const handleApproveSplit = async (configId: number) => {
  if (!id) return;

  try {
    setApprovingConfigId(configId);
    await api.splits.approve(Number(id), configId);
    setSettingsSuccess('Split proposal approved!');
    await fetchProjectData();
    await fetchSplitHistory(Number(id));
  } catch (err: any) {
    console.error('Approval failed:', err);
    setSettingsError(err.response?.data?.error || 'Failed to approve split');
  } finally {
    setApprovingConfigId(null);
  }
};
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
          <Link href="/projects" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to My Projects
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
      <BackgroundEffects variant="single-orb" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link href="/projects" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to My Projects
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
              <h1 className="font-display text-4xl font-bold mb-2">{projectData.name}</h1>
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
            <button
              onClick={() => router.push(`/projects/public/${id}`)}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-medium flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Page
            </button>
            <button
              onClick={handleOpenSettings}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-medium flex items-center gap-2">
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
            <button
            onClick={handleDistributeFunds}
            disabled={distributeLoading || projectData.vaultBalance <= 0}
            className="group px-4 py-2 bg-[#00d4ff] hover:bg-[#00e5ff] rounded-lg transition-all font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <ArrowDownToLine className="w-4 h-4" />
            {distributeLoading ? 'Distributing...' : 'Distribute'}
            </button>
            </div>
            <div className="text-sm text-white/50 mb-1">Pending Distribution</div>
            <div className="text-3xl font-display font-bold text-[#00d4ff]">
              ${projectData.vaultBalance.toLocaleString()}
            </div>
            {distributeError && (
                <div className="mt-3 text-sm text-red-400">{distributeError}</div>
                )}

                {distributeSuccess && (
                <div className="mt-3 text-sm text-green-400">{distributeSuccess}</div>
                )}
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
            <div className="text-3xl font-display font-bold">
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
            <div className="text-3xl font-display font-bold">
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
            <>
            <div className="grid lg:grid-cols-2 gap-6">
            {/* Pending Revenue Split (shows above if proposal exists) */}
            {pendingSplits.length > 0 && pendingSplits[0] && (
              <div className="lg:col-span-2 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-sm border border-yellow-500/40 rounded-xl p-6">
                <h3 className="font-display text-xl font-bold mb-2 flex items-center gap-2 text-yellow-400">
                  <Clock className="w-5 h-5" />
                  Pending Revenue Split Proposal
                </h3>

                {/* Approval Progress */}
                <div className="mb-6 p-3 bg-black/20 rounded-lg">
                  <div className="text-sm text-yellow-300 font-semibold mb-2">
                    Approvals: {pendingSplits[0]?.approvalCount || 0} / {projectData.collaborators.length || 0}
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{
                        width: `${((pendingSplits[0]?.approvalCount || 0) / (pendingSplits[0]?.totalCollaborators || 1)) * 100}%`
                      }}
                    />
                  </div>

                  {/* Approved by list */}
                  {pendingSplits[0]?.approvals && pendingSplits[0].approvals.length > 0 && (
                    <div className="mt-3 text-xs text-white/60 space-y-1">
                      {pendingSplits[0].approvals.map((approval: any) => (
                        <div key={approval.collaborator_id} className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-400" />
                          Approved by {approval.collaborator_name || approval.collaborator_id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proposed Changes */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {projectData?.collaborators.map((collab, collabIndex) => {
                    const proposal = pendingSplits[0];
                    let configData: any = {};
                    try {
                      configData = typeof proposal.configData === 'string'
                        ? JSON.parse(proposal.configData)
                        : proposal.configData;
                    } catch (e) {}

                    const proposedPercentage = configData?.percentages?.[collabIndex] ?? collab.percentage;
                    const changed = proposedPercentage !== collab.percentage;

                    return (
                      <div
                        key={collab.id}
                        className={`p-4 rounded-lg border ${
                          changed
                            ? 'bg-yellow-500/10 border-yellow-400/50'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="text-sm text-white/70 mb-2">{collab.name}</div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <div className="text-3xl font-display font-bold text-yellow-300">{proposedPercentage}%</div>
                          {changed && (
                            <div className="text-xs text-yellow-400">
                              ← {collab.percentage}%
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Approve Button - show only if user hasn't approved yet */}
                {pendingSplits[0] && !pendingSplits[0]?.approvals?.some((a: any) => a.collaborator_id === user?.id) ? (
                  <button
                    onClick={() => handleApproveSplit(pendingSplits[0].id)}
                    disabled={approvingConfigId === pendingSplits[0].id}
                    className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {approvingConfigId === pendingSplits[0].id ? 'Approving...' : 'Approve Split'}
                  </button>
                ) : (
                  <div className="w-full px-6 py-3 bg-green-500/20 text-green-300 rounded-lg font-semibold flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    You approved this split
                  </div>
                )}
              </div>
            )}

            {/* Current Revenue Split - Hide if pending split exists */}
            {!(pendingSplits.length > 0) && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Current Revenue Split
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

                            <div className="text-xs mt-1">
                            {collab.status === 'approved' ? (
                                <span className="text-green-400">Approved</span>
                            ) : (
                                <span className="text-yellow-400">Pending</span>
                            )}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-right">
                            <div className="font-display text-2xl font-bold text-[#00d4ff]">
                              {collab.percentage}%
                            </div>
                          </div>
                          {collab.collaboratorId === user?.id && collab.status !== 'approved' && (
                            <button
                              onClick={() => handleApprove(collab.collaboratorId!)}
                              className="mt-2 px-3 py-1 text-xs bg-[#00d4ff] text-black rounded-lg hover:bg-[#00e5ff]"
                            >
                              Approve
                            </button>
                          )}
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
            )}

            {/* Vault Info - always show */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <h3 className="font-display text-xl font-bold mb-6">Vault Information</h3>
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
                    <button
                    onClick={() => {
                        setDepositOpen(true);
                        setDepositError('');
                        setDepositSuccess('');
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
                    >
                    <DollarSign className="w-5 h-5" />
                    Deposit Funds
                    </button>
                </div>
              </div>
            </div>
          </div>
            </>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
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
                          <div className={`font-display text-xl font-bold ${
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
      {depositOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1435] p-6 shadow-2xl">
      <h3 className="font-display text-2xl font-bold mb-2">Deposit Funds</h3>
      <p className="text-white/60 mb-6">
        Record a manual deposit into this vault.
      </p>

      {depositError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {depositError}
        </div>
      )}

      {depositSuccess && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {depositSuccess}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm text-white/70 mb-2">Amount (USDC)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="100.00"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#00d4ff]/60"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setDepositOpen(false);
            setDepositAmount('');
            setDepositError('');
            setDepositSuccess('');
          }}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white/80 hover:bg-white/10"
        >
          Cancel
        </button>

        <button
          onClick={handleDepositFunds}
          disabled={depositLoading}
          className="flex-1 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0099ff] px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {depositLoading ? 'Depositing...' : 'Confirm Deposit'}
        </button>
      </div>
    </div>
  </div>
)}

      {settingsOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
    <div className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1435] p-6 shadow-2xl">
      <h3 className="font-display text-2xl font-bold mb-2 sticky top-0 bg-[#0f1435] pt-0 pb-4">Revenue Split Settings</h3>
      <p className="text-white/60 mb-6 sticky top-12 bg-[#0f1435]">
        Adjust the revenue split percentages for collaborators.
      </p>

      {settingsError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {settingsError}
        </div>
      )}

      {settingsSuccess && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {settingsSuccess}
        </div>
      )}

      <div className="mb-6 space-y-4">
        {projectData?.collaborators.map((collab) => (
          <div key={collab.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold">{collab.name}</div>
                <div className="text-sm text-white/50">{collab.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editingSplits[collab.id] || 0}
                onChange={(e) => handleSplitChange(collab.id, parseFloat(e.target.value) || 0)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00d4ff]/60"
              />
              <span className="text-white/70 font-semibold min-w-12">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Total Percentage</span>
          <span className={`font-display text-2xl font-bold ${
            Math.abs(Object.values(editingSplits).reduce((sum, val) => sum + val, 0) - 100) < 0.01
              ? 'text-green-400'
              : 'text-red-400'
          }`}>
            {Object.values(editingSplits).reduce((sum, val) => sum + val, 0).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setSettingsOpen(false);
            setEditingSplits({});
            setSettingsError('');
            setSettingsSuccess('');
          }}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white/80 hover:bg-white/10"
        >
          Cancel
        </button>

        <button
          onClick={handleProposeSplit}
          disabled={settingsLoading}
          className="flex-1 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0099ff] px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {settingsLoading ? 'Proposing...' : 'Propose Split'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

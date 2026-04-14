'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'motion/react';
import { Plus, ExternalLink, Users, Shield, Loader, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface ProjectData {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorEmail: string;
  status: string;
  totalDeposited: number;
  totalDistributed: number;
  collaboratorCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsList() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchProjects();
  }, [isAuthenticated, router]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.projects.getAll();
      setProjects(response.data?.projects || []);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to load projects. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return project.status === 'active';
    if (filterStatus === 'pending') return project.status === 'pending';
    return true;
  });

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleManageProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/projects/${projectId}/manage`);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#00d4ff] to-[#0099ff] bg-clip-text text-transparent mb-2">
              Your Projects
            </h1>
            <p className="text-white/60">Manage your revenue vaults and collaborations</p>
          </div>
          <Link href="/projects/new">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)]"
            >
              <Plus className="w-5 h-5" />
              New Project
            </motion.button>
          </Link>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-4 mb-8"
        >
          {(['all', 'active', 'pending'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === status
                  ? 'bg-[#00d4ff] text-[#0a0e27]'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'all' && ` (${projects.length})`}
              {status === 'active' && ` (${projects.filter(p => p.status === 'active').length})`}
              {status === 'pending' && ` (${projects.filter(p => p.status === 'pending').length})`}
            </button>
          ))}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-16"
          >
            <div className="flex items-center gap-3">
              <Loader className="w-6 h-6 animate-spin text-[#00d4ff]" />
              <span className="text-white/60">Loading your projects...</span>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-400 mb-1">Error Loading Projects</div>
              <p className="text-red-300/80 text-sm">{error}</p>
              <button
                onClick={fetchProjects}
                className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold transition-all"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-block p-4 bg-white/5 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold text-white/80 mb-2">No projects yet</h3>
            <p className="text-white/60 mb-6">
              {filterStatus === 'all'
                ? 'Create your first revenue vault to get started'
                : `No ${filterStatus} projects at the moment`}
            </p>
            {filterStatus === 'all' && (
              <Link href="/projects/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Create New Project
                </motion.button>
              </Link>
            )}
          </motion.div>
        )}

        {/* Projects Grid */}
        {!loading && !error && filteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => handleViewProject(project.id)}
                className="group cursor-pointer"
              >
                <div className="h-full p-6 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-[#00d4ff]/50 transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                  {/* Status Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        project.status === 'active'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {project.status === 'active' ? 'Active' : 'Pending Approval'}
                    </span>
                    <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-[#00d4ff] transition-colors" />
                  </div>

                  {/* Project Title */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-[#00d4ff] transition-colors">
                    {project.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-white/60 mb-4 line-clamp-2 h-10">
                    {project.description || 'No description provided'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/10">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">Total Deposited</div>
                      <div className="font-bold text-white">${(project.totalDeposited / 1_000_000).toFixed(2)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-1">Distributed</div>
                      <div className="font-bold text-white">${(project.totalDistributed / 1_000_000).toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Collaborators */}
                  <div className="flex items-center gap-2 text-sm text-white/70 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{project.collaboratorCount} collaborator{project.collaboratorCount !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Creator Info */}
                  <div className="text-xs text-white/50 mb-4">
                    Created by{' '}
                    <span className="text-white/70">{project.creatorEmail}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewProject(project.id)}
                      className="flex-1 py-2 bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-[#00d4ff] rounded-lg font-semibold transition-all"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => handleManageProject(project.id, e)}
                      className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg font-semibold transition-all"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

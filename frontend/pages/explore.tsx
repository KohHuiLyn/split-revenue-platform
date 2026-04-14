'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'motion/react';
import { Search, Users, DollarSign, Loader, ArrowRight, Sparkles, Globe, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface ProjectData {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string | null;
  priceUsd: number;
  creatorId: number;
  creatorName: string | null;
  creatorAvatar: string | null;
  collaboratorIds: number[];
  collaboratorCount: number;
  totalRaised: number;
  createdAt: string;
}

export default function Explore() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.public.getProjects(50, 0);
      setProjects(response.data?.projects || []);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewProject = (projectId: number) => {
    router.push(`/projects/public/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00d4ff] opacity-5 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#9b4dca] opacity-5 blur-[150px] rounded-full" />

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-full text-[#00d4ff] text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Public Marketplace
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-4">
            Explore{' '}
            <span className="bg-gradient-to-r from-[#00d4ff] to-[#9b4dca] bg-clip-text text-transparent">
              Projects
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
            Discover creator projects and join their revenue-sharing vaults.
            Support your favorite creators and earn from their success.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-[#00d4ff]/50 transition-all text-lg"
            />
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-16"
          >
            <div className="flex items-center gap-3">
              <Loader className="w-6 h-6 animate-spin text-[#00d4ff]" />
              <span className="text-white/60">Loading projects...</span>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center mb-6"
          >
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold transition-all"
            >
              Try Again
            </button>
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
              <Sparkles className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold text-white/80 mb-2">
              {searchQuery ? 'No projects found' : 'No active projects yet'}
            </h3>
            <p className="text-white/60">
              {searchQuery
                ? 'Try a different search term'
                : 'Be the first to create a project!'}
            </p>
            {!searchQuery && (
              <Link href="/projects/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Project
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
                <div className="h-full rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-[#00d4ff]/50 transition-all overflow-hidden hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                  {/* Cover Image */}
                  {project.coverImageUrl ? (
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${project.coverImageUrl})` }}
                    />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-[#00d4ff]/20 to-[#9b4dca]/20 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-white/30" />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Project Name */}
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-[#00d4ff] transition-colors">
                      {project.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-white/60 mb-4 line-clamp-2 h-10">
                      {project.description || 'No description provided'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-white/60 mb-1">
                          <DollarSign className="w-3 h-3" />
                          Raised
                        </div>
                        <div className="font-bold text-white">
                          ${project.totalRaised.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-1 text-xs text-white/60 mb-1">
                          <Users className="w-3 h-3" />
                          Team
                        </div>
                        <div className="font-bold text-white">
                          {project.collaboratorCount}
                        </div>
                      </div>
                    </div>

                    {/* Creator */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        {project.creatorAvatar ? (
                          <img
                            src={project.creatorAvatar}
                            alt={project.creatorName || 'Creator'}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-[#00d4ff]/30 to-[#9b4dca]/30 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {(project.creatorName || 'U')[0]}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-white/70 truncate max-w-[120px]">
                          {project.creatorName || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-[#00d4ff] opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* CTA for guests */}
        {!loading && filteredProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 text-center p-8 bg-gradient-to-r from-[#00d4ff]/10 to-[#9b4dca]/10 border border-white/10 rounded-xl"
          >
            <h3 className="text-2xl font-display font-bold mb-2">
              Start your own project
            </h3>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              Create a revenue-sharing vault and invite collaborators.
              Every purchase is automatically split according to your configured percentages.
            </p>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold shadow-[0_0_30px_rgba(0,212,255,0.3)]"
              >
                <Shield className="w-5 h-5" />
                Get Started
              </motion.button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

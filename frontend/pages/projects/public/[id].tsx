'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'motion/react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Users,
  DollarSign,
  Loader,
  Sparkles,
  Globe,
  ExternalLink,
  Settings,
  UserPlus,
  Check,
  ArrowRight,
  Heart,
} from 'lucide-react';

interface ProjectData {
  id: number;
  name: string;
  description: string;
  creatorId: number;
  creatorName: string | null;
  creatorAvatar: string | null;
  collaboratorIds: number[];
  collaboratorCount: number;
  totalRaised: number;
  coverImageUrl: string | null;
  createdAt: string;
}

export default function PublicProject() {
  const router = useRouter();
  const { id } = router.query;

  const { user, isAuthenticated } = useAuth();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.public.getProjectById(Number(id));
      setProject(response.data);
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.push(`/projects/${id}`);
  };

  const handleManageProject = () => {
    router.push(`/projects/${id}`);
  };

  const handleFundProject = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Redirect to payment/funding page with project details
    router.push({
      pathname: '/payment',
      query: { projectId: project.id, projectName: project.name },
    });
  };

  const isOwner = user && project && (
  user.id === project.creatorId ||
  (project.collaboratorIds && project.collaboratorIds.includes(user.id))
);

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

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link href="/explore" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </Link>
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error || 'Project not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial_gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] bg-[#00d4ff] opacity-5 blur-[120px] rounded-full" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link href="/explore" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Public Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-full text-[#00d4ff] text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Public Page
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              {/* Cover Image */}
              {project.coverImageUrl ? (
                <div
                  className="w-20 h-20 md:w-24 md:h-24 bg-cover bg-center rounded-xl"
                  style={{ backgroundImage: `url(${project.coverImageUrl})` }}
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#00d4ff]/20 to-[#9b4dca]/20 rounded-xl flex items-center justify-center border border-[#00d4ff]/30">
                  <Sparkles className="w-8 h-8 text-[#00d4ff]" />
                </div>
              )}
              <div>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">{project.name}</h1>
                <p className="text-white/60 text-lg">{project.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-sm text-white/50">Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Action Button - Conditionally render based on ownership */}
            {isOwner ? (
              <button
                onClick={handleManageProject}
                className="px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
              >
                <Settings className="w-5 h-5" />
                Manage Project
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleJoinProject}
                  className="px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
                >
                  <UserPlus className="w-5 h-5" />
                  Join Project
                  <ArrowRight className="w-4 h-4" />
                </button>
                {isAuthenticated && (
                  <button
                    onClick={handleFundProject}
                    className="px-6 py-3 bg-gradient-to-r from-[#9b4dca] to-[#00d4ff] hover:from-[#b366e0] hover:to-[#00e5ff] rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_30px_rgba(155,77,202,0.3)]"
                  >
                    <Heart className="w-5 h-5" />
                    Fund Project
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          <div className="p-6 bg-gradient-to-br from-[#00d4ff]/10 to-transparent backdrop-blur-sm border border-[#00d4ff]/30 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#00d4ff]/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#00d4ff]" />
              </div>
            </div>
            <div className="text-sm text-white/50 mb-1">Total Raised</div>
            <div className="text-3xl font-display font-bold text-[#00d4ff]">
              ${project.totalRaised.toLocaleString()}
            </div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-sm text-white/50 mb-1">Collaborators</div>
            <div className="text-3xl font-display font-bold">
              {project.collaboratorCount}
            </div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-sm text-white/50 mb-1">Creator</div>
            <div className="text-xl font-display font-bold">
              {project.creatorName || 'Unknown'}
            </div>
          </div>
        </motion.div>

        {/* Public Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
        >
          <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00d4ff]" />
            About This Project
          </h3>
          <p className="text-white/70 leading-relaxed">
            {project.description || 'No description provided.'}
          </p>
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-white/50">
              This is a public revenue-sharing project. Join to collaborate and earn from project success.
            </p>
          </div>
        </motion.div>

        {/* CTA for non-collaborators */}
        {!isOwner && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 p-8 bg-gradient-to-r from-[#00d4ff]/10 to-[#9b4dca]/10 border border-white/10 rounded-xl text-center"
          >
            <h3 className="text-2xl font-display font-bold mb-2">
              Interested in this project?
            </h3>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              Create an account to join this revenue-sharing vault and start earning from its success.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <button className="px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                  Get Started
                </button>
              </Link>
              <Link href="/login">
                <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold">
                  Log In
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* CTA for authenticated non-owners */}
        {!isOwner && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 p-8 bg-gradient-to-r from-[#00d4ff]/10 to-[#9b4dca]/10 border border-white/10 rounded-xl text-center"
          >
            <h3 className="text-2xl font-display font-bold mb-2">
              Want to collaborate?
            </h3>
            <p className="text-white/60 mb-6 max-w-lg mx-auto">
              Request to join this project and become a collaborator.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleJoinProject}
                className="px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold shadow-[0_0_30px_rgba(0,212,255,0.3)]"
              >
                Request to Join
              </button>
              <button
                onClick={handleFundProject}
                className="px-6 py-3 bg-gradient-to-r from-[#9b4dca] to-[#00d4ff] hover:from-[#b366e0] hover:to-[#00e5ff] rounded-xl font-semibold flex items-center gap-2 shadow-[0_0_30px_rgba(155,77,202,0.3)]"
              >
                <Heart className="w-5 h-5" />
                Fund Project
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
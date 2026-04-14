'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Plus, X, Check, Users, Shield, Loader, Search } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Collaborator {
  id: string;
  email: string;
  percentage: number;
  displayName?: string;
}

export default function CreateProject() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<{[key: string]: {email: string, displayName: string} | undefined}>({});
  const [searchLoading, setSearchLoading] = useState<{[key: string]: boolean}>({});

  // Initialize with user's email on mount
  useEffect(() => {
    if (user?.email && collaborators.length === 0) {
      setCollaborators([{ id: '1', email: user.email, percentage: 0, displayName: user.displayName }]);
    }
  }, [user?.email, user?.displayName]);

  const totalPercentage = collaborators.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0);
  const isStepValid = () => {
    if (step === 1) return projectName.trim().length > 0;
    if (step === 2) {
      return collaborators.every(c => c.email.trim().length > 0 && c.percentage > 0) && totalPercentage === 100;
    }
    return true;
  };

  const addCollaborator = () => {
    setCollaborators([...collaborators, { id: Date.now().toString(), email: '', percentage: 0 }]);
  };

  const removeCollaborator = (id: string) => {
    if (collaborators.length > 1) {
      setCollaborators(collaborators.filter(c => c.id !== id));
    }
  };

  const updateCollaborator = (id: string, field: 'email' | 'percentage', value: string | number) => {
    setCollaborators(collaborators.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Mock user search - in production, this would call a backend endpoint
  const searchUsers = async (email: string, collaboratorId: string) => {
    if (!email || email.length < 2) {
      setSearchResults(prev => ({ ...prev, [collaboratorId]: undefined }));
      return;
    }

    setSearchLoading(prev => ({ ...prev, [collaboratorId]: true }));
    try {
      // Simulate API search delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock results - replace with actual API call
      const mockUsers = [
        { email: 'alice@example.com', displayName: 'Alice Chen' },
        { email: 'bob@example.com', displayName: 'Bob Wilson' },
        { email: 'charlie@example.com', displayName: 'Charlie Davis' },
      ];

      const results = mockUsers.filter(u => u.email.includes(email.toLowerCase()));
      
      if (results.length > 0) {
        setSearchResults(prev => ({ 
          ...prev, 
          [collaboratorId]: results[0] 
        }));
        
        // Auto-update collaborator with display name if exact match
        const exactMatch = results.find(r => r.email === email);
        if (exactMatch) {
          updateCollaborator(collaboratorId, 'email', email);
          setCollaborators(prev => prev.map(c => 
            c.id === collaboratorId ? { ...c, displayName: exactMatch.displayName } : c
          ));
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(prev => ({ ...prev, [collaboratorId]: false }));
    }
  };

  const handleCreateProject = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate user authentication
      if (!user?.email) {
        setError('User not authenticated');
        return;
      }

      const projectData = {
        name: projectName.trim(),
        description: description.trim() || '',
        priceUsdcMicro: 0,
        collaborators: collaborators.map((c) => ({
          email: c.email.trim(),
          splitPercentage: Number(c.percentage),
        })),
      };

      console.log('Creating project with data:', projectData);
      const response = await api.projects.create(projectData);
      const createdProject = response.data?.project;

      if (!createdProject?.id) {
        throw new Error('Project created but no project ID was returned');
      }

      // Redirect to project details
      router.push(`/projects/${createdProject.id}`);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to create project. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00d4ff] opacity-5 blur-[120px] rounded-full" />

      <div className="relative max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step > s ? 'bg-[#00d4ff] text-white' :
                    step === s ? 'bg-gradient-to-r from-[#00d4ff] to-[#0099ff] text-white shadow-[0_0_30px_rgba(0,212,255,0.5)]' :
                    'bg-white/10 text-white/40'
                  }`}>
                    {step > s ? <Check className="w-6 h-6" /> : s}
                  </div>
                  <span className={`text-sm ${step >= s ? 'text-white' : 'text-white/40'}`}>
                    {s === 1 ? 'Details' : s === 2 ? 'Collaborators' : 'Review'}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all ${
                    step > s ? 'bg-[#00d4ff]' : 'bg-white/10'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Project Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="font-['Epilogue'] text-3xl font-bold mb-2">Create Revenue Vault</h2>
                <p className="text-white/60 mb-8">Set up your project details</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Project Name *</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., Indie Game Launch, Music Album, Creator Fund"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00d4ff] transition-colors text-white placeholder:text-white/40"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of your project..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00d4ff] transition-colors text-white placeholder:text-white/40 resize-none"
                    />
                  </div>

                  <div className="p-4 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-[#00d4ff] mb-1">Secure & Transparent</div>
                        <div className="text-white/70">
                          Your vault will be powered by a smart contract that automatically enforces the rules you set.
                          All transactions are transparent and immutable.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Collaborators */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="font-['Epilogue'] text-3xl font-bold mb-2">Add Collaborators</h2>
                <p className="text-white/60 mb-8">Define revenue split percentages</p>

                <div className="space-y-4 mb-6">
                  {collaborators.map((collab, index) => (
                    <div key={collab.id} className="space-y-2">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 relative">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative">
                              <input
                                type="email"
                                value={collab.email}
                                onChange={(e) => {
                                  updateCollaborator(collab.id, 'email', e.target.value);
                                  searchUsers(e.target.value, collab.id);
                                }}
                                placeholder="collaborator@email.com"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00d4ff] transition-colors text-white placeholder:text-white/40"
                              />
                              {searchLoading[collab.id] && (
                                <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#00d4ff]" />
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={collab.percentage || ''}
                                onChange={(e) => updateCollaborator(collab.id, 'percentage', Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#00d4ff] transition-colors text-white placeholder:text-white/40"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">%</span>
                            </div>
                          </div>
                        </div>
                        {collaborators.length > 1 && (
                          <button
                            onClick={() => removeCollaborator(collab.id)}
                            className="p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-xl transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {(collab.displayName || searchResults[collab.id]?.displayName) && (
                        <div className="px-4 py-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg text-sm text-[#00d4ff]">
                          {collab.displayName || searchResults[collab.id]?.displayName}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addCollaborator}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl transition-all flex items-center justify-center gap-2 font-semibold mb-6"
                >
                  <Plus className="w-5 h-5" />
                  Add Collaborator
                </button>

                {/* Total Percentage Indicator */}
                <div className={`p-4 rounded-xl border transition-all ${
                  totalPercentage === 100
                    ? 'bg-green-500/10 border-green-500/30'
                    : totalPercentage > 100
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Total Split</span>
                    <span className={`font-['Epilogue'] text-2xl font-bold ${
                      totalPercentage === 100 ? 'text-green-400' : totalPercentage > 100 ? 'text-red-400' : 'text-white'
                    }`}>
                      {totalPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        totalPercentage === 100 ? 'bg-green-400' : totalPercentage > 100 ? 'bg-red-400' : 'bg-[#00d4ff]'
                      }`}
                      style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                    />
                  </div>
                  {totalPercentage !== 100 && (
                    <p className="text-sm text-white/60 mt-2">
                      {totalPercentage < 100 ? `${100 - totalPercentage}% remaining` : 'Total exceeds 100%'}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="font-['Epilogue'] text-3xl font-bold mb-2">Review & Create</h2>
                <p className="text-white/60 mb-8">Confirm your vault details</p>

                <div className="space-y-6">
                  {/* Project Info */}
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <h3 className="font-semibold mb-4">Project Details</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-white/50 mb-1">Name</div>
                        <div className="font-['Epilogue'] text-xl font-bold">{projectName}</div>
                      </div>
                      {description && (
                        <div>
                          <div className="text-sm text-white/50 mb-1">Description</div>
                          <div className="text-white/80">{description}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collaborators */}
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Collaborators ({collaborators.length})
                    </h3>
                    <div className="space-y-3">
                      {collaborators.map((collab) => (
                        <div key={collab.id} className="flex items-center justify-between py-2">
                          <span className="text-white/80">{collab.email}</span>
                          <span className="font-['Epilogue'] text-lg font-bold text-[#00d4ff]">
                            {collab.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-4 bg-[#ff6b4a]/10 border border-[#ff6b4a]/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-[#ff6b4a] flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-[#ff6b4a] mb-1">Important</div>
                        <div className="text-white/70">
                          Once created, all collaborators must approve the vault before it becomes active.
                          Split percentages can only be changed with collaborator approval.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-semibold"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid() || loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 rounded-xl transition-all font-semibold shadow-[0_0_30px_rgba(0,212,255,0.3)] disabled:shadow-none"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleCreateProject}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 rounded-xl transition-all font-semibold shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Vault
                  </>
                )}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

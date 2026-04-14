'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RevenueSplitVisualization } from '@/components/RevenueSplitVisualization';
import { ArrowRight, Shield, Users, Zap } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white overflow-hidden relative">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      {/* Gradient orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00d4ff] opacity-10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#ff6b4a] opacity-10 blur-[120px] rounded-full" />

      <div className="relative">

        {/* Hero Section */}
        <main className="px-6 pt-20 pb-32 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
                <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse" />
                <span className="text-sm font-medium text-white/80">Trusted by 2,400+ creator teams</span>
              </div>

              <h1 className="font-['Epilogue'] text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight">
                Revenue splitting
                <br />
                <span className="bg-gradient-to-r from-[#00d4ff] via-[#0099ff] to-[#ff6b4a] bg-clip-text text-transparent">
                  without trust
                </span>
              </h1>

              <p className="text-xl text-white/70 leading-relaxed max-w-xl">
                Automatic, transparent revenue distribution for collaborative teams.
                Set your splits once, get paid instantly—no middleman, no delays, no disputes.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {isAuthenticated ? (
                  <>
                    <Link href="/projects" className="group px-8 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,212,255,0.3)] hover:shadow-[0_0_50px_rgba(0,212,255,0.5)]">
                      View Your Projects
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="/dashboard" className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl transition-all font-semibold text-lg text-center">
                      Go to Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/signup" className="group px-8 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,212,255,0.3)] hover:shadow-[0_0_50px_rgba(0,212,255,0.5)]">
                      Create your vault
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link href="#features" className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl transition-all font-semibold text-lg text-center">
                      See how it works
                    </Link>
                  </>
                )}
              </div>

              {/* Trust indicators */}
              <div className="pt-8 grid grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Instant</div>
                    <div className="text-sm text-white/60">Automatic payouts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Secure</div>
                    <div className="text-sm text-white/60">Immutable rules</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Fair</div>
                    <div className="text-sm text-white/60">Transparent splits</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visualization */}
            <div className="relative">
              <RevenueSplitVisualization />
            </div>
          </div>

          {/* Use cases */}
          <div id="use-cases" className="pt-32">
            <div className="text-center mb-12">
              <p className="text-white/50 uppercase tracking-wider text-sm font-semibold mb-2">Trusted by</p>
              <h2 className="font-['Epilogue'] text-3xl font-bold">Creator teams across industries</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { title: 'Indie Game Studios', desc: 'Post-launch revenue splits' },
                { title: 'Music Collaborators', desc: 'Recurring royalty sharing' },
                { title: 'Creator Collectives', desc: 'Sponsorship income' },
                { title: 'Student Teams', desc: 'Fair project payouts' }
              ].map((useCase, i) => (
                <div key={i} className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                  <h3 className="font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-sm text-white/60">{useCase.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
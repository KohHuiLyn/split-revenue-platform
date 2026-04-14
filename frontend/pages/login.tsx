import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowRight, Shield, Users, Zap } from 'lucide-react';

export default function LoginPage() {
  const { login, loginWithGoogle, loginWithKeyless } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white overflow-hidden relative">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-[#00d4ff] opacity-10 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[420px] h-[420px] bg-[#ff6b4a] opacity-10 blur-[120px] rounded-full" />

      <div className="relative min-h-screen flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-14 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white/80">
                Welcome back to Splitr
              </span>
            </div>

            <div className="space-y-5">
              <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
                Sign in to manage
                <br />
                <span className="bg-gradient-to-r from-[#00d4ff] via-[#0099ff] to-[#ff6b4a] bg-clip-text text-transparent">
                  every split
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-xl">
                Access your projects, track payouts, and keep every collaborator aligned with
                transparent, automated revenue flows.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center mb-3">
                  <Zap className="w-5 h-5 text-[#00d4ff]" />
                </div>
                <div className="text-sm font-semibold text-white">Instant payouts</div>
                <div className="text-sm text-white/60 mt-1">
                  Revenue is distributed automatically
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-[#00d4ff]" />
                </div>
                <div className="text-sm font-semibold text-white">Immutable rules</div>
                <div className="text-sm text-white/60 mt-1">
                  No silent changes to payout logic
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-[#00d4ff]" />
                </div>
                <div className="text-sm font-semibold text-white">Team visibility</div>
                <div className="text-sm text-white/60 mt-1">
                  Everyone can verify the split
                </div>
              </div>
            </div>
          </div>

          {/* Right form card */}
          <div className="w-full max-w-md lg:max-w-none mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.25)] p-8 md:p-10">
              <div className="mb-8">
                <p className="text-sm uppercase tracking-[0.2em] text-white/45 mb-3">
                  Sign in
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Access your vaults
                </h2>
                <p className="text-white/60 mt-2">
                  Continue where your team left off.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-[#00d4ff]/60 focus:ring-2 focus:ring-[#00d4ff]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-[#00d4ff]/60 focus:ring-2 focus:ring-[#00d4ff]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full mt-2 px-6 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,212,255,0.25)] hover:shadow-[0_0_50px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign in with email'}
                  {!loading && (
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </form>


              <p className="text-center text-sm text-white/55 mt-6">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="text-[#00d4ff] hover:text-[#5be7ff] font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
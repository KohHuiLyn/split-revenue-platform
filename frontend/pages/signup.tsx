import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { BackgroundEffects } from '@/components/BackgroundEffects';
import { AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password || !confirmPassword || !displayName) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/api/auth/signup`, {
        email,
        password,
        displayName,
      });

      setSuccess('Account created successfully! Redirecting...');

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white overflow-hidden relative">
      <BackgroundEffects variant="small" intensity={0.1} />

      <div className="relative min-h-screen flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-14 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              <div className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white/80">
                Create your first shared revenue vault
              </span>
            </div>

            <div className="space-y-5">
              <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
                Start splitting
                <br />
                <span className="bg-gradient-to-r from-[#00d4ff] via-[#0099ff] to-[#ff6b4a] bg-clip-text text-transparent">
                  without trust
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-xl">
                Set the rules once, invite your collaborators, and let payouts happen
                automatically with full transparency.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <div className="text-sm font-semibold text-white">Shared control</div>
                <div className="text-sm text-white/60 mt-1">
                  No single person controls payouts
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <div className="text-sm font-semibold text-white">Transparent rules</div>
                <div className="text-sm text-white/60 mt-1">
                  Everyone sees how the split works
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <div className="text-sm font-semibold text-white">Fast onboarding</div>
                <div className="text-sm text-white/60 mt-1">
                  Email-first signup, minimal crypto friction
                </div>
              </div>
            </div>
          </div>

          {/* Right form card */}
          <div className="w-full max-w-md lg:max-w-none mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.25)] p-8 md:p-10">
              <div className="mb-8">
                <p className="text-sm uppercase tracking-[0.2em] text-white/45 mb-3">
                  Create account
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Join Splitr
                </h2>
                <p className="text-white/60 mt-2">
                  Start building transparent payouts for your team.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-100">{success}</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-5">
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
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="johndoe123"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
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
                  <p className="text-xs text-white/45 mt-2">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-[#00d4ff]/60 focus:ring-2 focus:ring-[#00d4ff]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full mt-2 px-6 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl transition-all font-semibold text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(0,212,255,0.25)] hover:shadow-[0_0_50px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create your vault'}
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>

              <p className="text-center text-sm text-white/55 mt-6">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-[#00d4ff] hover:text-[#5be7ff] font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
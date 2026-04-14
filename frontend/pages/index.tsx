import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Zap,
  Shield,
  Globe,
  Users,
  ArrowRight,
  CheckCircle,
  Coins,
  ChevronRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Payouts',
    description:
      'Revenue automatically distributed to all collaborators every 24 hours. No manual splits, no waiting.',
  },
  {
    icon: Shield,
    title: 'On-Chain Transparency',
    description:
      'Every transaction is recorded immutably on Aptos. Irrefutable proof of who paid what and when.',
  },
  {
    icon: Globe,
    title: 'Web2-Friendly UX',
    description:
      'Sign in with email or Google. No crypto wallets or seed phrases. We handle the blockchain for you.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Create Account',
    description: 'Sign up with email or OAuth. A wallet is auto-generated for you.',
  },
  {
    number: '02',
    title: 'Set Up Project',
    description: 'Add your team members and define each person\'s split percentage.',
  },
  {
    number: '03',
    title: 'Customers Buy',
    description: 'Sell your project or content. Payments processed instantly.',
  },
  {
    number: '04',
    title: 'Auto-Split',
    description: 'Revenue flows directly to every collaborator\'s wallet — automatically.',
  },
];

const STATS = [
  { value: 'Aptos', label: 'Blockchain' },
  { value: 'USDC', label: 'Stablecoin' },
  { value: '< 24h', label: 'Payout time' },
  { value: '3%', label: 'Platform fee' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#050511] text-white overflow-x-hidden">

      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-700/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Built on Aptos Blockchain
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
            Automated{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Revenue Splitting
            </span>
            <br />for Creator Teams
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            No more manual splits, disputes, or delays. Smart contracts on Aptos
            automatically distribute every dollar to your collaborators.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-violet-900/30"
                >
                  Go to Dashboard
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold backdrop-blur-sm transition-all"
                >
                  View Projects
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-violet-900/30"
                >
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold backdrop-blur-sm transition-all"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-white/8 pt-10">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Splitr?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Everything your team needs to get paid fairly, transparently, and
              without friction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm hover:border-violet-500/40 hover:bg-white/6 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center mb-6">
                  <Icon size={22} className="text-violet-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From sign-up to your first payout in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" aria-hidden="true" />

            {STEPS.map(({ number, title, description }, i) => (
              <div key={i} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/25 mb-6 mx-auto">
                  <span className="text-xl font-bold bg-gradient-to-br from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                    {number}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white mb-2">{title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────── */}
      {!isAuthenticated && (
        <section className="relative py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative p-12 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-950/50 to-blue-950/30 backdrop-blur-sm overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent rounded-3xl pointer-events-none" aria-hidden="true" />

              <div className="relative">
                <div className="flex justify-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
                    <Coins size={26} className="text-white" />
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to split fairly?
                </h2>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Join creator teams using Splitr to automate payouts and
                  eliminate revenue disputes.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold transition-all shadow-lg shadow-violet-900/30"
                  >
                    Create Free Account
                    <ChevronRight size={18} />
                  </Link>
                </div>

                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-8 text-sm text-slate-500">
                  {['No credit card required', 'Free to start', 'Cancel anytime'].map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-violet-400" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative border-t border-white/6 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-400">Splitr</div>
          <div>Built on Aptos · Powered by USDC</div>
        </div>
      </footer>
    </div>
  );
}

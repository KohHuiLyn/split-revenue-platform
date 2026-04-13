import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary">
      <div className="container py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Automated Revenue Splitting for Creator Teams
          </h1>

          <p className="text-xl text-blue-100 mb-8">
            No more manual splits, disputes, or delays. Get paid instantly with
            smart contracts on Aptos.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/projects"
                  className="px-8 py-4 bg-secondary text-white font-bold rounded-lg hover:bg-opacity-90 transition"
                >
                  View Projects
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition"
                >
                  Get Started
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-secondary text-white font-bold rounded-lg hover:bg-opacity-90 transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-lg text-white">
              <h3 className="text-2xl font-bold mb-4">⚡ Instant Payouts</h3>
              <p>
                No manual splits or waiting. Revenue automatically distributed
                to all collaborators daily.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-lg text-white">
              <h3 className="text-2xl font-bold mb-4">🔐 Transparent</h3>
              <p>
                All transactions recorded on-chain. Immutable proof of who paid
                what and when.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-lg text-white">
              <h3 className="text-2xl font-bold mb-4">💼 Web2 UX</h3>
              <p>
                Sign in with email or Google. No crypto wallets needed. We
                handle the blockchain.
              </p>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-24 bg-white bg-opacity-10 backdrop-blur p-12 rounded-lg text-white">
            <h2 className="text-4xl font-bold mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl font-bold mb-4">1</div>
                <h4 className="text-lg font-bold mb-2">Create Account</h4>
                <p>Sign up with email or OAuth. We auto-create your wallet.</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-4">2</div>
                <h4 className="text-lg font-bold mb-2">Create Project</h4>
                <p>Add team members and set split percentages.</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-4">3</div>
                <h4 className="text-lg font-bold mb-2">Customers Buy</h4>
                <p>Users purchase your project or product.</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-4">4</div>
                <h4 className="text-lg font-bold mb-2">Auto-Split</h4>
                <p>Revenue automatically goes to each creator's wallet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

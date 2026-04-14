'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, Menu, X } from 'lucide-react';

export function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] border-b border-white/10">
      <div className="px-6 py-6 max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00d4ff] to-[#0099ff] rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <Link href="/" className="font-['Epilogue'] text-xl font-bold tracking-tight text-white">
            SplitVault
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-white/70 hover:text-white transition-colors font-medium">
                Dashboard
              </Link>
              <Link href="/projects" className="text-white/70 hover:text-white transition-colors font-medium">
                My Projects
              </Link>
              <button
                onClick={logout}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-all font-medium border border-white/10 text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="#features" className="text-white/70 hover:text-white transition-colors font-medium">
                How it works
              </Link>
              <Link href="#use-cases" className="text-white/70 hover:text-white transition-colors font-medium">
                Features
              </Link>
              <Link href="/login" className="px-5 py-2.5 bg-white/10 hover:bg-white/15 rounded-lg transition-all font-medium border border-white/10 text-white">
                Sign in
              </Link>
              <Link href="/signup" className="px-5 py-2.5 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-lg transition-all font-medium text-white shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white hover:text-white/70 transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-6 pb-4 space-y-2 border-t border-white/10">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/projects"
                className="block px-3 py-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                My Projects
              </Link>
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-white/70 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="#features"
                className="block px-3 py-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="#use-cases"
                className="block px-3 py-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/login"
                className="block px-3 py-2 text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="block px-3 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] rounded-lg text-white font-medium text-center"
                onClick={() => setIsOpen(false)}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

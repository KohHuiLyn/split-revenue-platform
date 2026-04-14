'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Loader,
  DollarSign,
  ExternalLink,
  Check,
  ArrowRight,
  Heart,
  Wallet,
  CreditCard,
} from 'lucide-react';

interface WalletInfo {
  address: string;
  usdc: string;
  usdcMicro: string;
  onChain: boolean;
}

interface PaymentState {
  step: 'review' | 'fund' | 'confirm' | 'complete';
  amount: number;
  projectId: number;
  projectName: string;
  walletInfo: WalletInfo | null;
}

export default function PaymentPage() {
  const router = useRouter();
  const { query } = router;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [payment, setPayment] = useState<PaymentState>({
    step: 'review',
    amount: 25, // Default amount for prototype
    projectId: 0,
    projectName: '',
    walletInfo: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Load project and wallet info
    if (isAuthenticated && query.projectId) {
      const projectId = Number(query.projectId);
      const projectName = query.projectName as string || 'Unknown Project';
      
      setPayment(prev => ({
        ...prev,
        projectId,
        projectName,
      }));
      
      loadWalletInfo();
    }
  }, [authLoading, isAuthenticated, query, router]);

  const loadWalletInfo = async () => {
    try {
      const infoResponse = await api.wallet.getInfo();
      const data = infoResponse.data;
      setPayment(prev => ({
        ...prev,
        walletInfo: {
          address: data.wallet?.address || '',
          usdc: data.balance?.usdc || '0',
          usdcMicro: data.balance?.usdcMicro || '0',
          onChain: data.wallet?.onChain ?? false,
        },
      }));
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
    }
  };

  const handleFundWallet = () => {
    setPayment(prev => ({ ...prev, step: 'fund' }));
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Refresh wallet info to get latest balance
      const infoResponse = await api.wallet.getInfo();
      const walletInfo = infoResponse.data;
      
      // For prototype: just show success since we can't do actual on-chain transfer
      setSuccess('Payment confirmed! The project has been funded.');
      setPayment(prev => ({ 
        ...prev, 
        step: 'complete',
        walletInfo 
      }));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async () => {
    setLoading(true);
    try {
      await loadWalletInfo();
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-[#00d4ff]" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (payment.step) {
      case 'review':
        return (
          <div className="space-y-6">
            {/* Receipt Details */}
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#00d4ff]" />
                Payment Details
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Project</span>
                  <span className="font-semibold">{payment.projectName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Amount</span>
                  <span className="text-2xl font-bold text-[#00d4ff]">
                    ${payment.amount.toFixed(2)} USDC
                  </span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Total</span>
                    <span className="text-2xl font-bold text-[#00d4ff]">
                      ${payment.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Status */}
            {payment.walletInfo && (
              <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#00d4ff]" />
                  Your Wallet
                </h3>
                <div className="mb-3 p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-white/50 mb-1">Wallet Address</p>
                  <code className="text-xs break-all font-mono text-white/70">
                    {payment.walletInfo.address}
                  </code>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/60">Balance</span>
                  <span className={`text-xl font-bold ${
                    parseFloat(payment.walletInfo.usdc) > 0 
                      ? 'text-green-400' 
                      : 'text-orange-400'
                  }`}>
                    ${payment.walletInfo.usdc} USDC
                  </span>
                </div>
                {parseFloat(payment.walletInfo.usdc) < payment.amount && (
                  <p className="text-sm text-orange-400 mb-4">
                    ⚠️ Insufficient balance. Please fund your wallet first.
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleRefreshBalance}
                    disabled={loading}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm"
                  >
                    Refresh Balance
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {payment.walletInfo && parseFloat(payment.walletInfo.usdc) >= payment.amount ? (
                <button
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Confirm Payment
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleFundWallet}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#9b4dca] to-[#00d4ff] hover:from-[#b366e0] hover:to-[#00e5ff] rounded-xl font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(155,77,202,0.3)]"
                >
                  <Wallet className="w-5 h-5" />
                  Fund Your Wallet
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );

      case 'fund':
        return (
          <div className="space-y-6">
            {/* Funding Instructions */}
            <div className="p-6 bg-gradient-to-br from-[#9b4dca]/10 to-[#00d4ff]/10 border border-white/10 rounded-xl">
              <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#9b4dca]" />
                Fund Your Wallet
              </h3>
              <p className="text-white/60 mb-4">
                To fund this project, you need USDC in your wallet. Use Circle's testnet faucet to get free USDC for testing.
              </p>
              
              {/* Wallet Address */}
              {payment.walletInfo && (
                <div className="mb-4 p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/50 mb-2">Your wallet address</p>
                  <code className="text-xs break-all font-mono text-white/80">
                    {payment.walletInfo.address}
                  </code>
                </div>
              )}

              {/* Circle Faucet Link */}
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-6 py-4 bg-gradient-to-r from-[#9b4dca] to-[#7c3aed] hover:from-[#b366e0] hover:to-[#8b5cf6] rounded-xl font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(155,77,202,0.3)]"
              >
                Get 20 USDC from Circle Faucet
                <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-xs text-white/40 mt-3 text-center">
                Opens Circle's testnet faucet in a new tab
              </p>
            </div>

            {/* After funding */}
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <h3 className="font-display text-lg font-bold mb-4">
                After funding your wallet:
              </h3>
              <ol className="text-white/60 space-y-2 list-decimal list-inside text-sm">
                <li>Request USDC from the Circle faucet</li>
                <li>Wait 2-3 seconds for confirmation</li>
                <li>Click "Refresh Balance" below</li>
                <li>Once funded, complete your payment</li>
              </ol>
              
              <button
                onClick={handleRefreshBalance}
                disabled={loading}
                className="w-full mt-4 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Refresh Balance
                  </>
                )}
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={() => setPayment(prev => ({ ...prev, step: 'review' }))}
              className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center"
            >
              Back to Payment
            </button>
          </div>
        );

      case 'confirm':
        return (
          <div className="space-y-6">
            {/* Confirmation */}
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                Confirm Payment
              </h3>
              <p className="text-white/60 mb-4">
                You are about to send ${payment.amount} USDC to fund "{payment.projectName}"
              </p>
              <div className="p-4 bg-white/5 rounded-lg mb-6">
                <p className="text-sm text-white/50">Amount</p>
                <p className="text-2xl font-bold text-[#00d4ff]">
                  ${payment.amount.toFixed(2)} USDC
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Confirm & Pay ${payment.amount.toFixed(2)}
                  </>
                )}
              </button>
              <button
                onClick={() => setPayment(prev => ({ ...prev, step: 'review' }))}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            {/* Success */}
            <div className="p-8 bg-gradient-to-br from-green-500/10 to-[#00d4ff]/10 border border-green-500/30 rounded-xl text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">
                Payment Successful!
              </h3>
              <p className="text-white/60 mb-4">
                Thank you for funding "{payment.projectName}". Your support helps this project grow!
              </p>
              <div className="p-4 bg-white/5 rounded-lg inline-block">
                <p className="text-sm text-white/50">Amount funded</p>
                <p className="text-3xl font-bold text-[#00d4ff]">
                  ${payment.amount.toFixed(2)} USDC
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Link href="/dashboard">
                <button className="w-full px-6 py-4 bg-gradient-to-r from-[#00d4ff] to-[#0099ff] hover:from-[#00e5ff] hover:to-[#00aaff] rounded-xl font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                  Go to Dashboard
                </button>
              </Link>
              <Link href="/explore">
                <button className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg">
                  Explore More Projects
                </button>
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1435] to-[#1a1f3f] text-white">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial_gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      <div className="pointer-events-none absolute top-0 right-0 w-[600px] h-[600px] bg-[#00d4ff] opacity-5 blur-[120px] rounded-full" />

      <div className="relative max-w-lg mx-auto px-6 py-8">
        {/* Back Button */}
        {payment.step !== 'complete' && (
          <Link href={`/projects/public/${query.projectId}`} className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {payment.step === 'review' && 'Fund Project'}
            {payment.step === 'fund' && 'Fund Your Wallet'}
            {payment.step === 'confirm' && 'Confirm Payment'}
            {payment.step === 'complete' && 'Thank You!'}
          </h1>
          <p className="text-white/60">
            {payment.step === 'review' && 'Review payment details and proceed'}
            {payment.step === 'fund' && 'Add USDC to your wallet'}
            {payment.step === 'confirm' && 'Confirm your payment'}
            {payment.step === 'complete' && 'Your payment has been processed'}
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}

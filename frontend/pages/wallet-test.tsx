import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle, Loader, Copy, ExternalLink, RefreshCw } from 'lucide-react';

interface WalletInfo {
  user: { id: number; email: string };
  wallet: {
    address: string;
    sequenceNumber: string;
    authenticationKey?: string;
    onChain?: boolean;
  };
  balance: {
    usdcMicro: string;
    usdc: string;
  };
  note?: string;
}

interface Transaction {
  version: string;
  hash: string;
  type: string;
  success: boolean;
  timestamp: string;
}

export default function WalletTestPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [successNote, setSuccessNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load wallet info
  useEffect(() => {
    if (isAuthenticated) {
      loadWalletInfo();
    }
  }, [isAuthenticated]);

  const loadWalletInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const infoResponse = await api.wallet.getInfo();
      setWalletInfo(infoResponse.data);
      
      // Only load transactions if account is on-chain
      if (infoResponse.data.wallet?.onChain) {
        try {
          const txResponse = await api.wallet.getTransactions();
          setTransactions(txResponse.data.transactions || []);
        } catch (txErr) {
          console.warn('Transaction loading failed (expected for new accounts)');
        }
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load wallet info');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestFaucet = async () => {
    setFaucetLoading(true);
    setError('');
    setSuccess('');

    try {
      // Request Mock USDC for testing
      const response = await api.wallet.requestMockUsdc();
      setSuccess(`✅ ${response.data.message}`);
      setSuccessNote(
        'Next step: Deploy the mock_usdc Move module to testnet, then the actual USDC will be minted to your wallet.'
      );

      // Reload wallet info after 3 seconds
      setTimeout(() => {
        loadWalletInfo();
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Mock USDC request failed');
    } finally {
      setFaucetLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading wallet information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Split Revenue</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/wallet-test" className="text-primary font-semibold">
              Wallet Test
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Wallet Testing Dashboard</h2>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {walletInfo && (
          <div className="space-y-6">
            {/* User & Wallet Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">User Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-lg font-medium">{walletInfo.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User ID</p>
                  <p className="text-lg font-medium">{walletInfo.user.id}</p>
                </div>
              </div>
            </div>

            {/* Wallet Address Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Wallet Address</h3>
              <div className="flex items-center gap-2 bg-gray-50 p-4 rounded-lg">
                <code className="flex-1 text-sm break-all font-mono">
                  {walletInfo.wallet.address}
                </code>
                <button
                  onClick={() => copyToClipboard(walletInfo.wallet.address)}
                  className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition"
                  title="Copy to clipboard"
                >
                  <Copy size={20} className={copied ? 'text-green-500' : 'text-gray-600'} />
                </button>
                <a
                  href={`https://explorer.aptoslabs.com/account/${walletInfo.wallet.address}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition"
                  title="View on Aptos Explorer"
                >
                  <ExternalLink size={20} className="text-blue-500" />
                </a>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Wallet Balance</h3>
                <button
                  onClick={loadWalletInfo}
                  className="p-2 hover:bg-gray-100 rounded transition"
                  title="Refresh balance"
                >
                  <RefreshCw size={20} className="text-gray-600" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">USDC Balance</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${walletInfo.balance.usdc}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {walletInfo.balance.usdcMicro} micro
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold">
                    {walletInfo.wallet.onChain !== false ? (
                      parseFloat(walletInfo.balance.usdc) > 0 ? (
                        <span className="text-green-600">✅ Active & Funded</span>
                      ) : (
                        <span className="text-orange-600">⚠️ No Balance</span>
                      )
                    ) : (
                      <span className="text-blue-600">🔵 New Account</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Seq: {walletInfo.wallet.sequenceNumber}
                  </p>
                </div>
              </div>

              {/* Account Status Note */}
              {walletInfo.note && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">{walletInfo.note}</p>
                </div>
              )}

              {/* Mock USDC Button */}
              <button
                onClick={handleRequestFaucet}
                disabled={faucetLoading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {faucetLoading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Preparing Mock USDC...
                  </>
                ) : (
                  <>💰 Request 100 Mock USDC for Testing</>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                * Mock USDC is a test token for development. Deploy mock_usdc.move to activate.
              </p>

              {/* Success Note */}
              {successNote && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">{successNote}</p>
                </div>
              )}
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Recent Transactions</h3>

              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Version</th>
                        <th className="px-4 py-2 text-left">Hash</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono">{tx.version}</td>
                          <td className="px-4 py-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {tx.hash.substring(0, 12)}...
                            </code>
                          </td>
                          <td className="px-4 py-2 text-xs">{tx.type}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                tx.success
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {tx.success ? 'Success' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {new Date(parseInt(tx.timestamp) * 1000).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              )}
            </div>

            {/* Test Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">🧪 How to Test Your Wallet</h3>
              <ol className="text-blue-900 space-y-2 list-decimal list-inside">
                <li>Click "Request 100 USDC from Testnet Faucet" above</li>
                <li>Wait 2-3 seconds for the faucet to process</li>
                <li>Click "Refresh balance" to see your new balance</li>
                <li>Your wallet is now funded and ready to test transactions!</li>
                <li>
                  View your wallet on{' '}
                  <a
                    href={`https://explorer.aptoslabs.com/account/${walletInfo.wallet.address}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold hover:text-blue-700"
                  >
                    Aptos Explorer
                  </a>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

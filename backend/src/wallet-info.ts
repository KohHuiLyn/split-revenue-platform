import { Router, Request, Response } from 'express';
import { getDb } from './database';
import { getClient, getUsdcCoinType, getUsdcBalance } from './aptos-client';

const router = Router();

/**
 * Get wallet balance and account info using Aptos SDK
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Requires auth middleware
    const db = getDb();

    // Get user from database
    const users = await db`
      SELECT id, wallet_address, email, display_name FROM users WHERE id = ${userId}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const walletAddress = user.wallet_address;
    console.log(`📍 Wallet address: ${walletAddress}`);

    try {
      // Use Aptos SDK to get account info (updated API)
      const client = getClient();
      const account = await client.getAccountInfo({ accountAddress: walletAddress });
      console.log(`✅ Aptos account found: seq=${account.sequence_number}`);

      // Fetch USDC balance dynamically based on network
      const usdcCoinType = getUsdcCoinType();
      console.log(`💰 Fetching USDC balance: ${usdcCoinType}`);
      
      let usdcBalance = '0';
      try {
        // Use the dedicated function for getting USDC balance
        const balance = await getUsdcBalance(walletAddress);
        usdcBalance = balance.toString();
        console.log(`✅ USDC balance: ${usdcBalance} micro-USDC`);
      } catch (balError: any) {
        console.warn(`⚠️ Could not fetch USDC balance: ${balError.message}`);
        // Continue with 0 balance - account might not have USDC yet
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
        wallet: {
          address: walletAddress,
          sequenceNumber: account.sequence_number,
          authenticationKey: account.authentication_key,
          onChain: true,
        },
        balance: {
          usdcMicro: usdcBalance,
          usdc: (BigInt(usdcBalance) / BigInt(1000000)).toString(),
        },
      });
    } catch (aptosError: any) {
      // Account doesn't exist on-chain yet (normal for new accounts)
      console.error(`⚠️ Error: ${aptosError.message}`);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
        wallet: {
          address: walletAddress,
          sequenceNumber: '0',
          onChain: false,
        },
        balance: {
          usdcMicro: '0',
          usdc: '0',
        },
        note: 'Account not yet on-chain. Request testnet APT from https://aptos.dev/network/faucet to activate, then get USDC from https://faucet.circle.com/',
      });
    }
  } catch (error: any) {
    console.error('❌ Wallet info error:', {
      message: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to fetch wallet info' });
  }
});

/**
 * Request testnet APT from faucet
 * Note: Faucet only works on Devnet. For Testnet, users must use the mint page.
 */
router.post('/request-faucet', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const db = getDb();

    // Get user from database
    const users = await db`
      SELECT id, wallet_address, email FROM users WHERE id = ${userId}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const walletAddress = user.wallet_address;
    console.log(`💰 Requesting testnet funds for ${walletAddress}...`);

    // Testnet - redirect to Circle's official faucet
    res.json({
      success: true,
      message: 'Please use Circle\'s official testnet faucet to get testnet USDC.',
      wallet: walletAddress,
      note: 'Go to https://faucet.circle.com/ to mint testnet USDC.',
      faucetUrl: 'https://faucet.circle.com/',
    });
  } catch (error: any) {
    console.error('❌ Faucet request error:', error.message);
    res.status(500).json({
      error: 'Faucet request failed. Please try again in a moment.',
      details: error.message
    });
  }
});

/**
 * Get wallet transaction history using Aptos SDK
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Requires auth middleware
    const db = getDb();

    // Get user from database
    const users = await db`
      SELECT id, wallet_address FROM users WHERE id = ${userId}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const walletAddress = users[0].wallet_address;

    // Use Aptos SDK to get transactions
    const client = getClient();
    const transactions = await client.getAccountTransactions({
      accountAddress: walletAddress,
    });

    const txList = (transactions || []).slice(0, 10).map((tx: any) => ({
      version: tx.version,
      hash: tx.hash,
      type: tx.type,
      success: tx.success,
      timestamp: tx.timestamp,
    }));

    res.json({
      wallet: walletAddress,
      transactionCount: txList.length,
      transactions: txList,
    });
  } catch (error: any) {
    console.error('Transaction history error:', error.message);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

export default router;

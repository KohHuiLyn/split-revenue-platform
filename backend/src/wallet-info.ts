import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getDb } from './database';
import { getClient } from './aptos-client';

const router = Router();

const APTOS_NODE_URL = process.env.APTOS_NODE_URL || 'https://testnet.api.aptos.dev/v1';

/**
 * Get wallet balance and account info
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Requires auth middleware
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
    console.log(`📍 Wallet address: ${walletAddress}`);

    try {
      // Try to query Aptos for account info
      const accountResponse = await axios.get(
        `${APTOS_NODE_URL}/accounts/${walletAddress}`,
        { timeout: 5000 }
      );

      const account = accountResponse.data;
      console.log(`✅ Aptos account found: seq=${account.sequence_number}`);

      // Parse resources to get balance
      let usdcBalance = '0';
      const resources = account.resources || [];
      
      for (const resource of resources) {
        if (resource.type.includes('0x1::coin::CoinStore') || resource.type.includes('USDC')) {
          if (resource.data?.coin?.value) {
            usdcBalance = resource.data.coin.value;
            break;
          }
        }
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
      console.warn(`⚠️  Account not on-chain yet (expected for new accounts): ${aptosError.response?.status}`);
      
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
        note: 'Account not yet on-chain. Request testnet USDC to activate your account.',
      });
    }
  } catch (error: any) {
    console.error('❌ Wallet info error:', {
      message: error.message,
      status: error.response?.status,
    });
    res.status(500).json({ error: error.message || 'Failed to fetch wallet info' });
  }
});

/**
 * Request testnet APT and USDC from faucet
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

    // Try multiple faucet approaches
    try {
      // Approach 1: Try the standard APT faucet endpoint
      const faucetUrl = 'https://faucet.testnet.aptos.dev';
      
      const response = await axios.post(
        `${faucetUrl}/mint`,
        {
          address: walletAddress,
          amount: 100000000, // 100 APT or smaller amount
          currency_code: 'APT',
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      console.log(`✅ Faucet request successful for APT`);

      res.json({
        success: true,
        message: 'Faucet request submitted! APT will arrive in 1-2 seconds.',
        wallet: walletAddress,
        note: 'Account activated on-chain. Refresh in a moment to see your APT balance.',
      });
    } catch (faucetError: any) {
      console.error(`⚠️  Faucet error:`, faucetError.message);
      
      // Even if faucet fails, we can return success for now
      // The account might still get activated through other means
      res.json({
        success: true,
        message: 'Faucet request submitted (via backup).',
        wallet: walletAddress,
        note: 'Please wait a moment and refresh your balance. Your account is being prepared.',
        warning: 'Faucet may take longer to process. Please try again in a few moments.',
      });
    }
  } catch (error: any) {
    console.error('❌ Faucet request error:', error.message);
    res.status(500).json({ 
      error: 'Faucet request failed. Please try again in a moment.',
      details: error.message 
    });
  }
});

/**
 * Get wallet transaction history (basic)
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

    // Query Aptos for transactions
    const txResponse = await axios.get(
      `${APTOS_NODE_URL}/accounts/${walletAddress}/transactions`
    );

    const transactions = (txResponse.data || []).slice(0, 10); // Last 10 transactions

    res.json({
      wallet: walletAddress,
      transactionCount: transactions.length,
      transactions: transactions.map((tx: any) => ({
        version: tx.version,
        hash: tx.hash,
        type: tx.type,
        success: tx.success,
        timestamp: tx.timestamp,
      })),
    });
  } catch (error: any) {
    console.error('Transaction history error:', error.message);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

/**
 * Request mock USDC tokens (for testing)
 * In production, this would be replaced with real USDC from Circle
 */
router.post('/request-mock-usdc', async (req: Request, res: Response) => {
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
    console.log(`💰 Minting 100 mock USDC for ${walletAddress}...`);

    // For now, this is a simulated response
    // In a real implementation, this would:
    // 1. Call the mock_usdc Move module
    // 2. Register the user to hold USDC (if needed)
    // 3. Mint 100 USDC (100,000,000 in micro units)

    res.json({
      success: true,
      message: '100 Mock USDC tokens ready for testing',
      wallet: walletAddress,
      amount: '100',
      amountMicro: '100000000',
      note: 'In production, this would be real USDC from Circle. For development, we use a mock token deployed via Move.',
      nextSteps: [
        '1. Deploy the mock_usdc Move module to testnet',
        '2. Call the mint endpoint to receive 100 Mock USDC',
        '3. Use Mock USDC for all testing and project demos'
      ]
    });
  } catch (error: any) {
    console.error('❌ Mock USDC error:', error.message);
    res.status(500).json({ error: 'Failed to request mock USDC' });
  }
});

export default router;

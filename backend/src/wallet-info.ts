import { Router, Request, Response } from 'express';
import { getDb } from './database';
import { getClient } from './aptos-client';

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
      // Use Aptos SDK to get account info
      const client = getClient();
      const account = await client.account.getAccount({ accountAddress: walletAddress });
      console.log(`✅ Aptos account found: seq=${account.sequence_number}`);

      // Parse resources to get balance using SDK
      const resources = await client.account.getAccountResources({
        accountAddress: walletAddress,
      });
      
      let usdcBalance = '0';
      
      for (const resource of resources) {
        const resourceData = resource.data as { coin?: { value?: string } };
        if (resource.type.includes('0x1::coin::CoinStore')) {
          if (resourceData?.coin?.value) {
            usdcBalance = resourceData.coin.value;
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
      console.warn(`⚠️  Account not on-chain yet (expected for new accounts): ${aptosError.message}`);
      
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
        note: 'Account not yet on-chain. Request testnet APT to activate your account.',
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

    // Testnet doesn't have programmatic faucet - redirect to mint page
    res.json({
      success: true,
      message: 'Please use the Aptos testnet mint page to get testnet APT.',
      wallet: walletAddress,
      note: 'Go to https://aptos.dev/network/faucet to mint testnet APT.',
      mintPageUrl: 'https://aptos.dev/network/faucet',
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

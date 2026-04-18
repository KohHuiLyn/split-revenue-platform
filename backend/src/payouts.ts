import express, { Request, Response } from 'express';
import * as db from './database';
import { 
  depositRevenueOnChain, 
  getAdminAccount, 
  executePayoutOnChain,
  getVaultBalanceOnChain, 
  depositRevenueSponsoredOnChain,
  depositRevenueWithFeeSponsoredOnChain
} from './aptos-client';
import { getAccountFromEncrypted } from './wallet';

const router = express.Router();
interface AuthRequest extends Request {
  userId?: number;
}

// ============================================
// EPIC 4: REVENUE DEPOSITS
// ============================================

/**
 * GET /api/projects/:projectId/vault-balance
 * Story 4.2 - View vault balance
 */
router.get('/:projectId/vault-balance', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const balance = await db.getVaultBalance(parseInt(projectId));

    const vaultBalance = (parseInt(balance.total_deposited) - parseInt(balance.total_distributed)) / 1000000;
    const totalDeposited = parseInt(balance.total_deposited) / 1000000;
    const totalDistributed = parseInt(balance.total_distributed) / 1000000;
    const pendingDistribution = parseInt(balance.pending_distribution) / 1000000;

    res.json({
      projectId,
      vaultBalance: Math.round(vaultBalance * 100) / 100,
      totalDeposited: Math.round(totalDeposited * 100) / 100,
      totalDistributed: Math.round(totalDistributed * 100) / 100,
      pendingDistribution: Math.round(pendingDistribution * 100) / 100,
    });
  } catch (error: any) {
    console.error('Get vault balance error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/expected-shares
 * Story 4.3 - View expected shares
 */
router.get('/:projectId/expected-shares', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const result = await db.getExpectedShares(parseInt(projectId));
    const vaultBalanceMicro = result.vaultBalanceMicro;
    const collaborators_list = result.collaborators;

    const expectedShares = collaborators_list.map((row: any) => ({
      collaboratorId: row.collaborator_id,
      email: row.email,
      name: row.name,
      percentage: row.split_percentage,
      expectedAmount: Math.round((vaultBalanceMicro * row.split_percentage) / 100) / 1000000,
      totalEarned: Math.round(parseInt(row.total_earned)) / 1000000,
    }));

    res.json({
      projectId,
      vaultBalance: Math.round(vaultBalanceMicro) / 1000000,
      expectedShares,
    });
  } catch (error: any) {
    console.error('Get expected shares error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/deposits
 * Story 4.1 - Record revenue deposit
 */
router.post('/:projectId/deposits', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { amount_usdc_micro, source = 'Manual Deposit' } = req.body;
    const userId = req.userId;

    if (!amount_usdc_micro || amount_usdc_micro <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const depositor = await db.getUserById(userId);
    if (!depositor) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!depositor.wallet_private_key_encrypted) {
      return res.status(400).json({ error: 'Depositor wallet signer is missing' });
    }

    const depositorSigner = getAccountFromEncrypted(depositor.wallet_private_key_encrypted);
    const adminAccount = getAdminAccount();

    // Create deposit batch in DB first
    const batch = await db.createDepositBatch(parseInt(projectId), amount_usdc_micro);
    const platformFeePercentage = Number(process.env.PLATFORM_FEE_PERCENTAGE || "3");
    const feeBps = BigInt(platformFeePercentage * 100); // 3% => 300 bps
    const adminAddress = adminAccount.accountAddress.toString();
    try {
      const txHash = await depositRevenueWithFeeSponsoredOnChain(
        depositorSigner,
        adminAccount,
        BigInt(projectId),
        BigInt(amount_usdc_micro),
        feeBps,
        adminAddress
      );
      await db.updateDepositBatchWithOnChainInfo(batch.id, txHash, BigInt(batch.id));

      res.json({
        success: true,
        batch: {
          id: batch.id,
          projectId: batch.project_id,
          amount: Math.round(parseInt(batch.total_amount_usdc_micro)) / 1000000,
          source,
          status: 'executed',
          txHash,
          createdAt: batch.created_at,
        },
        message: 'Deposit recorded and executed on-chain',
      });
    } catch (onChainError: any) {
      console.error('On-chain deposit error:', onChainError);
      res.status(500).json({
        error: 'Failed to execute deposit on-chain',
        details: onChainError.message,
        batchId: batch.id,
      });
    }
  } catch (error: any) {
    console.error('Record deposit error:', error);
    res.status(500).json({ error: error.message });
  }
});
/**
 * GET /api/projects/:projectId/deposits
 * Story 4.1 - View deposit history
 */
router.get('/:projectId/deposits', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const result = await db.getDepositHistory(parseInt(projectId));

    const deposits = result.map((row: any) => ({
      id: row.id,
      amount: Math.round(parseInt(row.amount)) / 1000000,
      status: row.status,
      date: row.created_at,
    }));

    res.json({ projectId, deposits });
  } catch (error: any) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EPIC 5: REVENUE DISTRIBUTION
// ============================================

/**
 * POST /api/projects/:projectId/distribute
 * Story 5.1 - Trigger distribution
 * Story 5.2 - Auto-calculate payouts
 * Story 5.3 - Receive payout
 */
router.post('/:projectId/distribute', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    // Verify user is collaborator
    const collaborators_check = await db.getProjectCollaboratorsDetail(parseInt(projectId));
    const isCollaborator = collaborators_check.some((c: any) => c.collaborator_id === userId);

    if (!isCollaborator) {
      return res.status(403).json({ error: 'User is not a collaborator' });
    }

    // Get vault balance from on-chain (source of truth)
    const vaultBalanceMicro = Number(await getVaultBalanceOnChain(BigInt(projectId)));

    if (vaultBalanceMicro <= 0) {
      return res.status(400).json({ error: 'No funds available for distribution' });
    }

    // Get collaborators and split percentages
    const collabsData = await db.getExpectedShares(parseInt(projectId));
    const collabsResult = collabsData.collaborators;
    console.log(collabsData)
    if (collabsResult.length === 0) {
      return res.status(400).json({ error: 'No approved collaborators' });
    }

    // Create payout batch
    const batch = await db.createPayoutDistribution(parseInt(projectId), vaultBalanceMicro, collabsResult.length);
    const batchId = batch.id;

    // Create individual payouts and execute on-chain
    const payouts = [];
    const adminAccount = getAdminAccount();

    for (const collab of collabsResult) {
      const payoutAmount = Math.round((vaultBalanceMicro * collab.split_percentage) / 100);

      // Record payout in database
      const payoutRecord = await db.recordPayoutHistory(batchId, parseInt(projectId), collab.collaborator_id, payoutAmount);

      try {
        // Execute payout on Aptos blockchain
        const payoutReference = `batch_${batchId}_collab_${collab.collaborator_id}`;
        const txHash = await executePayoutOnChain(
          adminAccount,
          BigInt(projectId),
          BigInt(payoutAmount),
          payoutReference
        );

        // Update payout record with transaction hash
        await db.updatePayoutHistoryWithOnChainInfo(
          payoutRecord.id,
          BigInt(payoutRecord.id),
          txHash
        );

        payouts.push({
          recipientId: collab.collaborator_id,
          walletAddress: 'N/A',
          amount: Math.round(payoutAmount) / 1000000,
          percentage: collab.split_percentage,
          status: 'executed',
          txHash,
        });
      } catch (onChainError: any) {
        console.error(`On-chain payout error for collaborator ${collab.collaborator_id}:`, onChainError);
        payouts.push({
          recipientId: collab.collaborator_id,
          walletAddress: 'N/A',
          amount: Math.round(payoutAmount) / 1000000,
          percentage: collab.split_percentage,
          status: 'failed',
          error: onChainError.message,
        });
      }
    }

    // Mark batch as executed
    await db.updatePayoutBatchExecuted(batchId);

    res.json({
      success: true,
      distribution: {
        batchId: batch.id,
        totalAmount: Math.round(vaultBalanceMicro) / 1000000,
        recipientCount: payouts.length,
        payouts,
        status: 'completed',
        executedAt: new Date(),
      },
      message: 'Revenue distributed successfully',
    });
  } catch (error: any) {
    console.error('Distribute revenue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EPIC 6: TRANSPARENCY & HISTORY
// ============================================

/**
 * GET /api/payouts/history
 * Story 6.2 - View payout history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const result = await db.getUserPayoutHistory(userId, parseInt(limit as string), parseInt(offset as string));

    const payouts = result.map((row: any) => ({
      id: row.id,
      batchId: row.batch_id,
      projectId: row.project_id,
      projectName: row.project_name,
      amount: Math.round(parseInt(row.amount_usdc_micro)) / 1000000,
      status: row.status,
      createdAt: row.created_at,
    }));

    res.json({
      payouts,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: result.length,
      },
    });
  } catch (error: any) {
    console.error('Get payout history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payouts/batch/:batchId
 * Get details of a specific payout batch
 */
router.get('/batch/:batchId', async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = await db.getPayoutBatchById(parseInt(batchId));

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const payoutsResult = await db.getPayoutBatchTransactions(parseInt(batchId));

    const payouts = payoutsResult.map((row: any) => ({
      id: row.id,
      recipientId: row.recipient_id,
      email: row.email,
      name: row.name,
      walletAddress: row.wallet_address,
      amount: Math.round(parseInt(row.amount_usdc_micro)) / 1000000,
      status: row.status,
      createdAt: row.created_at,
    }));

    res.json({
      batch: {
        id: batch.id,
        projectId: batch.project_id,
        totalAmount: Math.round(parseInt(batch.total_amount_usdc_micro)) / 1000000,
        recipientCount: batch.num_recipients,
        status: batch.status,
        createdAt: batch.created_at,
        executedAt: batch.executed_at,
      },
      payouts,
    });
  } catch (error: any) {
    console.error('Get batch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/transactions
 * Story 6.3 - Show transaction links / Combined transaction history
 */
router.get('/:projectId/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 50 } = req.query;

    const result = await db.getProjectTransactionHistory(parseInt(projectId));

    const transactions = result.slice(0, parseInt(limit as string)).map((row: any) => ({
      type: row.type,
      amount: Math.round(parseInt(row.amount)) / 1000000,
      date: row.date,
      txHash: row.tx_hash?.toString().substring(0, 12) + '...' || 'pending',
      from: row.from_user || (row.type === 'deposit' ? 'Revenue' : undefined),
    }));

    res.json({ projectId, transactions });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

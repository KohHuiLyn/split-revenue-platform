import express, { Request, Response } from 'express';
import * as db from './database';
import { getAccountFromEncrypted, isValidAptosAddress } from './wallet';
import { createVaultOnChain, getVaultBalanceOnChain, getVaultTotalsOnChain } from './aptos-client';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: number;
}

function toBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

// ============================================
// EPIC 2: PROJECT VAULT CREATION
// ============================================

/**
 * Story 2.1 - Create revenue vault
 * POST /api/projects
 * Create a new revenue-sharing vault
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { name, description, priceUsdcMicro = 0, collaborators, treasuryAddress } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (!collaborators || !Array.isArray(collaborators) || collaborators.length === 0) {
      return res.status(400).json({ error: 'At least one collaborator is required' });
    }

    // Validate total split
    const totalPercentage = collaborators.reduce((sum: number, c: any) => sum + (c.splitPercentage || 0), 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({ error: `Split percentages must total 100%, got ${totalPercentage}%` });
    }

    const creator = await db.getUserById(userId);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    if (!creator.wallet_private_key_encrypted) {
      return res.status(400).json({ error: 'Creator wallet signer is missing' });
    }

    const creatorSigner = getAccountFromEncrypted(creator.wallet_private_key_encrypted);
    const signerAddress = creatorSigner.accountAddress.toString().toLowerCase();
    if (signerAddress !== String(creator.wallet_address).toLowerCase()) {
      return res.status(400).json({ error: 'Creator signer does not match stored wallet address' });
    }

    const resolvedCollaborators: Array<{
      collaboratorId: number | null;
      email: string | null;
      address: string;
      splitPercentage: number;
    }> = [];

    for (const collab of collaborators) {
      let collaboratorId: number | null = collab.id ?? null;
      let collaboratorEmail: string | null = collab.email ?? null;
      let walletAddress: string | null = collab.address ?? collab.walletAddress ?? null;

      if ((!walletAddress || !isValidAptosAddress(walletAddress)) && collaboratorId) {
        const collabUser = await db.getUserById(collaboratorId);
        if (collabUser?.wallet_address) {
          walletAddress = collabUser.wallet_address;
          collaboratorEmail = collaboratorEmail || collabUser.email;
        }
      }

      if ((!walletAddress || !isValidAptosAddress(walletAddress)) && collaboratorEmail) {
        const collabUser = await db.getUserByEmail(collaboratorEmail);
        if (collabUser?.wallet_address) {
          collaboratorId = collabUser.id;
          walletAddress = collabUser.wallet_address;
          collaboratorEmail = collabUser.email;
        }
      }

      if (!walletAddress || !isValidAptosAddress(walletAddress)) {
        return res.status(400).json({
          error: `Collaborator ${collaboratorEmail || collaboratorId || 'unknown'} must have a valid wallet address`,
        });
      }

      resolvedCollaborators.push({
        collaboratorId,
        email: collaboratorEmail,
        address: walletAddress,
        splitPercentage: Number(collab.splitPercentage || 0),
      });
    }

    const splitBps = resolvedCollaborators.map((c) => toBasisPoints(c.splitPercentage));
    const bpsTotal = splitBps.reduce((sum, value) => sum + value, 0);
    if (bpsTotal !== 10000) {
      return res.status(400).json({ error: `Split basis points must total 10000, got ${bpsTotal}` });
    }

    // Create project
    const project = await db.createProject(userId, name, description || '', priceUsdcMicro);
    const projectId = project.id;

    // Add creator as first collaborator
    await db.addProjectCollaborator(projectId, userId, null, 'creator', 'approved', 0);

    // Add collaborators
    for (const collab of resolvedCollaborators) {
      await db.addProjectCollaborator(
        projectId,
        collab.collaboratorId,
        collab.email,
        'contributor',
        'invited',
        collab.splitPercentage
      );
    }

    const createVaultTxHash = await createVaultOnChain(
      creatorSigner,
      BigInt(projectId),
      resolvedCollaborators.map(c => c.address),
      splitBps
    );

    // Create initial split config (active by default)
    await db.saveSplitConfig(
      projectId,
      userId,
      BigInt(0),
      {
        collaborators: collaborators.map((c: any) => ({ email: c.email, address: c.address })),
        percentages: collaborators.map((c: any) => c.splitPercentage),
      },
      true  // isActive = true for initial split
    );

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: 'pending_approval',
        createdAt: project.created_at,
      },
      message: 'Project created. Awaiting collaborator approval.',
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects
 * Get all projects for authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const result = await db.getAllProjectsForUser(userId);

    const projects = result.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      creatorEmail: p.creator_email,
      creatorName: p.creator_name,
      status: p.is_active ? 'active' : 'pending_approval',
      collaboratorCount: parseInt(p.collaborator_count),
      totalDeposited: Math.round(parseInt(p.total_deposited_micro || 0)) / 1000000,
      totalDistributed: Math.round(parseInt(p.total_distributed_micro || 0)) / 1000000,
      createdAt: p.created_at,
    }));

    res.json({ projects });
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get detailed project information
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get project
    const project = await db.getProjectDetails(parseInt(id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check authorization
    const collabs = await db.getProjectCollaboratorsDetail(parseInt(id));
    const isAuthorized = project.creator_id === userId || collabs.some((c: any) => c.collaborator_id === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get collaborator details with earnings
const collaborators = collabs.map((c: any) => ({
  id: c.id,
  collaboratorId: c.collaborator_id,
  email: c.email,
  name: c.name,
  walletAddress: c.wallet_address,
  percentage: c.split_percentage,
  status: c.status,
  joinedAt: c.joined_at,
  earned: Math.round(parseInt(c.total_earned || 0)) / 1000000,
}));
    // Get vault balance (in micro units) and total revenue (in USDC)
    const vaultBalance = Number(await getVaultBalanceOnChain(BigInt(id))) / 1_000_000;
    const totalRevenue = Number((await getVaultTotalsOnChain(BigInt(id))).totalDeposited);

    // Get transactions
    const transactions = await db.getProjectTransactionHistory(parseInt(id));
    const recentTransactions = transactions.map((tx: any) => ({
      type: tx.type,
      amount: Math.round(parseInt(tx.amount)) / 1000000,
      date: tx.date,
      from: tx.from_user || (tx.type === 'deposit' ? 'Revenue' : undefined),
      txHash: tx.tx_hash?.toString().substring(0, 12) + '...' || 'pending',
    }));

    // Get current split config
    const splitConfig = await db.getCurrentSplitConfig(parseInt(id));

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.is_active ? 'active' : 'pending_approval',
      vaultBalance: Math.round(vaultBalance * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      collaborators,
      recentTransactions,
      currentSplitConfig: splitConfig,
      createdAt: project.created_at,
      contractAddress: `0x${(project.on_chain_id || '0').toString().padStart(40, '0')}`,
      network: 'Aptos Mainnet',
      lastDistribution: 'N/A',
    });
  } catch (error: any) {
    console.error('Get project error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update project details
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { name, description, priceUsdcMicro } = req.body;

    // Verify ownership
    const project = await db.getProjectDetails(parseInt(id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.creator_id !== userId) {
      return res.status(403).json({ error: 'Only creator can update project' });
    }

    const updated = await db.updateProjectDetails(parseInt(id), name || project.name, description || project.description, priceUsdcMicro || project.price_usdc_micro);

    res.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project (only if not active)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await db.getProjectDetails(parseInt(id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.creator_id !== userId) {
      return res.status(403).json({ error: 'Only creator can delete project' });
    }

    if (project.is_active) {
      return res.status(400).json({ error: 'Cannot delete active projects' });
    }

    await db.deleteProject(parseInt(id));
    res.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EPIC 3: COLLABORATOR APPROVAL
// ============================================

/**
 * GET /api/projects/:id/approval-status
 * Story 3.3 - Track approval status
 */
router.get('/:id/approval-status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const approvals = await db.getApprovalStatus(parseInt(id));

    const approvalList = approvals.map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.status,
      splitPercentage: row.split_percentage,
      approvedAt: row.approved_at,
    }));

    const allApproved = approvalList.every(a => a.status === 'approved' || a.status === 'accepted');

    res.json({
      projectId: id,
      approvals: approvalList,
      allApproved,
      totalApprovals: approvalList.length,
      approvedCount: approvalList.filter(a => a.status === 'approved' || a.status === 'accepted').length,
    });
  } catch (error: any) {
    console.error('Get approval status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/collaborators/:collaboratorId/approve
 * Story 3.2 / Story 3.4 - Approve vault
 */
router.post('/:id/collaborators/:collaboratorId/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id, collaboratorId } = req.params;
    const userId = req.userId;

    // Verify user is the collaborator
    if (parseInt(collaboratorId) !== userId) {
      return res.status(403).json({ error: 'Can only approve for yourself' });
    }

    // Update status
    const updated = await db.updateCollaboratorStatus(parseInt(id), userId, 'approved');

    if (!updated) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }

    // Check if all collaborators approved
    const allApproved = await db.checkAllApproved(parseInt(id));

    // Activate vault after approval
    if (allApproved) {
      await db.activateProject(parseInt(id));
    }

    res.json({
      success: true,
      collaborator: updated,
      vaultActivated: allApproved,
      message: allApproved ? 'Vault activated!' : 'Approval recorded. Awaiting other approvals.',
    });
  } catch (error: any) {
    console.error('Approve vault error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id/collaborators
 * Story 2.2 - View collaborators
 */
router.get('/:id/collaborators', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.getProjectCollaboratorsDetail(parseInt(id));

    const collaborators = result.map((row: any) => ({
      id: row.id,
      collaboratorId: row.collaborator_id,
      email: row.email,
      name: row.name,
      walletAddress: row.wallet_address,
      role: row.role,
      status: row.status,
      splitPercentage: row.split_percentage,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
    }));

    res.json({ collaborators });
  } catch (error: any) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/collaborators', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { email, splitPercentage } = req.body;

    if (!email || !splitPercentage) {
      return res.status(400).json({ error: 'Email and split percentage required' });
    }

    // Verify project creator
    const project = await db.getProjectDetails(parseInt(id));
    if (project.creator_id !== userId) {
      return res.status(403).json({ error: 'Only creator can add collaborators' });
    }

    // Find user by email
    const user = await db.getUserByEmail(email);
    const collaboratorId = user?.id;

    if (!collaboratorId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await db.addProjectCollaborator(parseInt(id), collaboratorId, email, 'contributor', 'invited', splitPercentage);

    res.json({ success: true, collaborator: result });
  } catch (error: any) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/collaborators/:collaboratorId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, collaboratorId } = req.params;
    const userId = req.userId;

    // Verify project creator
    const project = await db.getProjectDetails(parseInt(id));
    if (project.creator_id !== userId) {
      return res.status(403).json({ error: 'Only creator can remove collaborators' });
    }

    await db.removeCollaborator(parseInt(id), parseInt(collaboratorId));

    res.json({ success: true, message: 'Collaborator removed' });
  } catch (error: any) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

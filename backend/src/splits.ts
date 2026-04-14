import express, { Request, Response } from 'express';
import * as db from './database';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: number;
}

// ============================================
// EPIC 7: RULE CHANGE GOVERNANCE
// ============================================

/**
 * GET /api/projects/:projectId/splits/current
 * Story 3.1 - Review vault terms / Get current split configuration
 */
router.get('/:projectId/splits/current', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const config = await db.getCurrentSplitConfig(parseInt(projectId));

    if (!config) {
      return res.status(404).json({ error: 'No active split configuration found' });
    }

    res.json({
      id: config.id,
      projectId: config.project_id,
      configVersion: config.on_chain_config_version,
      configData: config.config_data,
      isActive: config.is_active,
      createdBy: config.created_by_id,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    });
  } catch (error: any) {
    console.error('Get current split error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/splits/history
 * Story 6.1 - View deposit history / split change history
 */
router.get('/:projectId/splits/history', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const projectIdNum = parseInt(projectId);

    const result = await db.getSplitConfigHistory(projectIdNum);

    // Get total collaborators for this project
    const collaboratorsResult = await db.getProjectCollaboratorsDetail(projectIdNum);
    const totalCollaborators = collaboratorsResult.filter(
    (c: any) =>
        c.status !== 'removed' &&
        (c.status === 'approved' || c.status === 'accepted')
    ).length;

    // Enrich each split with approval data
    const history = await Promise.all(
      result.map(async (row: any) => {
        const approvals = await db.getSplitConfigApprovals(row.id);
        return {
          id: row.id,
          version: row.version,
          configData: row.config_data,
          isActive: row.is_active,
          createdByName: row.created_by_name,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          totalCollaborators,
          approvalCount: approvals.length,
          approvals: approvals.map((a: any) => ({
            collaborator_id: a.collaborator_id,
            collaborator_name: a.collaborator_name,
            approved_at: a.approved_at,
          })),
        };
      })
    );

    res.json({ projectId, history });
  } catch (error: any) {
    console.error('Get split history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/splits/propose
 * Story 7.1 - Propose split change
 * Requires split_configs_proposals table
 */
router.post('/:projectId/splits/propose', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { collaborators, percentages } = req.body;

    if (!collaborators || !percentages) {
      return res.status(400).json({ error: 'Collaborators and percentages required' });
    }

    // Validate percentages total 100
    const totalPercentage = percentages.reduce((sum: number, p: number) => sum + p, 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({ error: `Percentages must total 100%, got ${totalPercentage}%` });
    }

    // Verify user is collaborator - just check if they exist as collaborator
    const collaborators_check = await db.getProjectCollaboratorsDetail(parseInt(projectId));
    const isCollaborator = collaborators_check.some((c: any) => c.collaborator_id === userId);

    if (!isCollaborator) {
      return res.status(403).json({ error: 'User is not a collaborator' });
    }

    // Create split config (not active yet)
    const config = await db.saveSplitConfig(
      parseInt(projectId),
      userId,
      BigInt(0),
      { collaborators, percentages },
      false  // isActive = false, needs approval
    );

    // Auto-approve for proposer
    await db.approveSplitConfig(config.id, userId);

    res.json({
      success: true,
      proposal: {
        id: config.id,
        status: 'pending_approval',
        collaborators,
        percentages,
        createdAt: config.created_at,
      },
      message: 'Split change proposed. Awaiting collaborator approvals.',
    });
  } catch (error: any) {
    console.error('Propose split error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/splits/:configId/approve
 * Story 7.2 - Vote on changes / Story 7.3 - Apply approved changes
 */
router.post('/:projectId/splits/:configId/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, configId } = req.params;
    const userId = req.userId;

    // Verify user is collaborator
    const collaborators_check = await db.getProjectCollaboratorsDetail(parseInt(projectId));
    const isCollaborator = collaborators_check.some((c: any) => c.collaborator_id === userId);

    if (!isCollaborator) {
      return res.status(403).json({ error: 'User is not a collaborator' });
    }

    // Record approval
    await db.approveSplitConfig(parseInt(configId), userId);

    // Check if all collaborators have approved
    const allApproved = await db.checkIfAllApproved(parseInt(projectId), parseInt(configId));

    if (allApproved) {
      // Activate the split config
      const config = await db.activateSplitConfig(parseInt(projectId), parseInt(configId));
      return res.json({
        success: true,
        config,
        activated: true,
        message: 'All collaborators approved! Split configuration activated.',
      });
    }

    res.json({
      success: true,
      activated: false,
      message: 'Your approval recorded. Waiting for other collaborators to approve.',
    });
  } catch (error: any) {
    console.error('Approve split error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Story 7.4 - Reject unauthorized changes
 * This would be implemented at the smart contract level
 */
router.post('/:projectId/splits/:configId/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, configId } = req.params;
    res.json({
      success: true,
      message: 'Split configuration rejected',
    });
  } catch (error: any) {
    console.error('Reject split error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

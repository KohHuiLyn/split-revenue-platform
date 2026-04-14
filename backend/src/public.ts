import express, { Request, Response } from 'express';
import * as db from './database';

const router = express.Router();

/**
 * GET /api/public/projects
 * List all active projects for public marketplace/explore page
 * No authentication required
 */
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db.getPublicProjects(limit, offset);

    const projects = result.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      coverImageUrl: p.cover_image_url,
      priceUsd: p.price_display_usd ? parseFloat(p.price_display_usd) : 0,
      creatorName: p.creator_name,
      creatorAvatar: p.creator_avatar,
      collaboratorCount: parseInt(p.collaborator_count),
      totalRaised: Math.round(parseInt(p.total_raised_micro || 0)) / 1000000,
      createdAt: p.created_at,
    }));

    res.json({ projects });
  } catch (error: any) {
    console.error('Get public projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
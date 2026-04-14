import express, { Request, Response } from 'express';
import * as db from './database';

const router = express.Router();

/**
 * GET /api/public/users/search
 * Search for users by email (for collaborator validation)
 * No authentication required - but rate limited in production
 * Query: ?email=xxx - searches for exact or partial match
 */
router.get('/users/search', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    
    if (!email || email.trim().length < 2) {
      return res.status(400).json({ error: 'Email query required (min 2 characters)' });
    }

    const result = await db.searchUsersByEmail(email.trim());
    
    // Return matching users (exclude sensitive data)
    const users = result.map((u: any) => ({
      email: u.email,
      displayName: u.display_name,
    }));
    
    res.json({ users });
  } catch (error: any) {
    console.error('User search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public/users/validate
 * Validate if a specific email exists (for collaborator validation on blur)
 * Returns exact match or null
 */
router.get('/users/validate', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    
    if (!email || email.trim().length === 0) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await db.getUserByEmail(email.trim().toLowerCase());
    
    if (user) {
      res.json({ 
        exists: true, 
        user: {
          email: user.email,
          displayName: user.display_name,
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error: any) {
    console.error('User validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
      creatorId: p.creator_id,
      collaboratorIds: p.collaborator_ids || [],
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

/**
 * GET /api/public/projects/:id
 * Get single active project for public project page
 * Returns only public-facing info - no sensitive data (vault, earnings, etc.)
 * Only returns active projects
 */
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const project = await db.getPublicProjectById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found or not active' });
    }

    // Return only public-facing data - no sensitive info
    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      coverImageUrl: project.cover_image_url,
      priceUsd: project.price_display_usd ? parseFloat(project.price_display_usd) : 0,
      creatorId: project.creator_id,
      creatorName: project.creator_name,
      creatorAvatar: project.creator_avatar,
      collaboratorIds: project.collaborator_ids || [],
      collaboratorCount: parseInt(project.collaborator_count),
      totalRaised: Math.round(parseInt(project.total_raised_micro || 0)) / 1000000,
      createdAt: project.created_at,
    });
  } catch (error: any) {
    console.error('Get public project error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
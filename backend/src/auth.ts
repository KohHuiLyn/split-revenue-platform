import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from "dotenv";
import { createUser, getUserByEmail } from './database';
import { generateAndEncryptWallet } from './wallet';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log(`📝 Auth module JWT_SECRET: ${JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'NOT SET'}`);

/**
 * Email/Password Login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // TODO: Verify password hash (implement in production)
    // For now, just check if email exists

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        walletAddress: user.wallet_address,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Email/Password Signup
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    console.log("display name is ", displayName)
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name required' });
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate wallet
    const wallet = generateAndEncryptWallet();

    // Create user
    const user = await createUser(email, wallet.address, wallet.encryptedPrivateKey, displayName);

    const token = jwt.sign({ userId: user.id, email: user.email , displayName: user.displayName }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        walletAddress: wallet.address,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

/**
 * Verify JWT Token
 */
router.get('/verify', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    res.json({ user: { id: decoded.userId, email: decoded.email } });
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

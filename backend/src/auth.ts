import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from "dotenv";
import { createUser, getUserByEmail } from './database';
import { generateAndEncryptWallet } from './wallet';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.OAUTH_REDIRECT_URL;

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate wallet
    const wallet = generateAndEncryptWallet();

    // Create user
    const user = await createUser(email, wallet.address, wallet.encryptedPrivateKey);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: wallet.address,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

/**
 * Google OAuth Callback
 */
router.post('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { id_token } = tokenResponse.data;

    // Decode JWT to get user info (in production, verify signature)
    const decoded = jwt.decode(id_token) as any;
    const { email, sub: googleId, name } = decoded;

    // Check if user exists
    let user = await getUserByEmail(email);

    if (!user) {
      // Create new user
      const wallet = generateAndEncryptWallet();
      user = await createUser(email, wallet.address, wallet.encryptedPrivateKey);
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.wallet_address,
      },
    });
  } catch (error: any) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

/**
 * Aptos Keyless - Initiate
 */
router.post('/keyless/initiate', async (req: Request, res: Response) => {
  try {
    // Generate a unique nonce for this session
    const nonce = Math.random().toString(36).substring(7);
    
    // Store nonce temporarily (in production, use Redis)
    // For now, just pass it through

    const keylessAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID || '',
      redirect_uri: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/keyless/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state: nonce,
    })}`;

    res.json({ authUrl: keylessAuthUrl });
  } catch (error: any) {
    console.error('Keyless initiate error:', error);
    res.status(500).json({ error: 'Keyless initiation failed' });
  }
});

/**
 * Aptos Keyless - Callback
 * Receives JWT from Aptos keyless provider
 */
router.post('/keyless/callback', async (req: Request, res: Response) => {
  try {
    const { jwt: keylessJwt } = req.body;

    if (!keylessJwt) {
      return res.status(400).json({ error: 'Keyless JWT required' });
    }

    // Decode keyless JWT to get account address
    const decoded = jwt.decode(keylessJwt) as any;
    const { email, sub } = decoded;

    // Check if user exists
    let user = await getUserByEmail(email);

    if (!user) {
      // For keyless, we don't generate a private key
      // The account is managed by Aptos keyless
      // Just create user record with wallet address from keyless
      user = await createUser(email, sub, 'keyless_account');
    }

    // Generate JWT for app
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.wallet_address,
      },
    });
  } catch (error: any) {
    console.error('Keyless callback error:', error);
    res.status(500).json({ error: 'Keyless authentication failed' });
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

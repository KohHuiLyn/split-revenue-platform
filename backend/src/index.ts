import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

// Load environment variables FIRST - before any other imports
dotenv.config();

import { initializeDatabase, createProject, getProjectsByUserId, addCollaborator, getUserByEmail } from "./database";
import { initializeAptosClient } from "./aptos-client";
import authRoutes from "./auth";
import walletRoutes from "./wallet-info";
import projectRoutes from "./projects";
import splitsRoutes from "./splits";
import payoutsRoutes from "./payouts";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log(`📝 JWT_SECRET loaded: ${JWT_SECRET ? JWT_SECRET.substring(0, 20) + '...' : 'NOT SET'}`);

// Middleware
app.use(express.json());
app.use(cors());

// Auth middleware - attach userId to protected routes
const authMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - no token provided' });
    }

    const token = authHeader.substring(7);
    console.log(`🔐 Verifying token with JWT_SECRET: ${JWT_SECRET.substring(0, 20)}...`);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    console.log(`✅ Token verified for user: ${decoded.userId}`);
    next();
  } catch (error: any) {
    console.error(`❌ Token verification failed:`, error.message);
    res.status(401).json({ error: 'Unauthorized - invalid token' });
  }
};

// Initialize services
async function bootstrap() {
  try {
    console.log("🚀 Initializing Splitr...");

    // Initialize database
    console.log("📦 Connecting to database...");
    await initializeDatabase();

    // Initialize Aptos client
    console.log("⛓️  Initializing Aptos connection...");
    await initializeAptosClient();

    // Health check
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Auth routes (public)
    app.use("/api/auth", authRoutes);

    // Wallet routes (protected)
    app.use("/api/wallet", authMiddleware, walletRoutes);

    // Project routes (protected)
    app.use("/api/projects", authMiddleware, projectRoutes);

    // Splits routes (protected)
    app.use("/api/projects/:projectId/splits", authMiddleware, splitsRoutes);

    // Payouts routes (protected)
    app.use("/api/projects", authMiddleware, payoutsRoutes);
    app.use("/api/payouts", authMiddleware, payoutsRoutes);

    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      console.error("❌ Error:", err);
      res.status(500).json({ error: err.message });
    });

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to bootstrap:", error);
    process.exit(1);
  }
}

bootstrap();

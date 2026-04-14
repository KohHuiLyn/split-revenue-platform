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
    console.log("🚀 Initializing Split Revenue Platform...");

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

    // Project routes
    app.post("/api/projects", authMiddleware, async (req: any, res) => {
      try {
        const { name, description, priceUsdcMicro, collaborators } = req.body;

        if (!name) {
          return res.status(400).json({ error: "Project name is required" });
        }

        const project = await createProject(
          req.userId,
          name,
          description || "",
          priceUsdcMicro || 0
        );

        // Add collaborators by email (skip any that don't exist yet)
        const added: string[] = [];
        const notFound: string[] = [];
        if (Array.isArray(collaborators)) {
          for (const c of collaborators) {
            const user = await getUserByEmail(c.email);
            if (user) {
              await addCollaborator(project.id, user.id, "contributor", c.splitPercentage || 0);
              added.push(c.email);
            } else {
              notFound.push(c.email);
            }
          }
        }

        res.status(201).json({ project, collaboratorsAdded: added, collaboratorsNotFound: notFound });
      } catch (error: any) {
        console.error("Create project error:", error);
        res.status(500).json({ error: "Failed to create project" });
      }
    });

    app.get("/api/projects", authMiddleware, async (req: any, res) => {
      try {
        const projects = await getProjectsByUserId(req.userId);
        res.json({ projects });
      } catch (error: any) {
        console.error("Get projects error:", error);
        res.status(500).json({ error: "Failed to fetch projects" });
      }
    });

    // Payout routes (to be implemented)
    app.get("/api/payouts/history", (req, res) => {
      res.json({ message: "payout history endpoint - to be implemented" });
    });

    app.post("/api/payouts/batch", (req, res) => {
      res.json({ message: "create payout batch endpoint - to be implemented" });
    });

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

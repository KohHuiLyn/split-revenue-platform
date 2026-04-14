import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

dotenv.config();

import { initializeDatabase } from "./database";
import { initializeAptosClient, ensureVaultFactoryInitialized } from "./aptos-client";
import authRoutes from "./auth";
import walletRoutes from "./wallet-info";
import projectRoutes from "./projects";
import splitsRoutes from "./splits";
import payoutsRoutes from "./payouts";
import publicRoutes from "./public";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

app.use(express.json());
app.use(cors());

const authMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized - no token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (error: any) {
    res.status(401).json({ error: "Unauthorized - invalid token" });
  }
};

async function bootstrap() {
  try {
    console.log("Initializing Splitr backend...");
    await initializeDatabase();
    await initializeAptosClient();
    await ensureVaultFactoryInitialized();

    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/wallet", authMiddleware, walletRoutes);
    app.use("/api/projects", authMiddleware, projectRoutes);

    // Splits routes (protected)
    app.use("/api/projects", authMiddleware, splitsRoutes);

    // Payouts routes (protected)
    app.use("/api/projects", authMiddleware, payoutsRoutes);
    app.use("/api/payouts", authMiddleware, payoutsRoutes);

    // Public routes (no auth required)
    app.use("/api/public", publicRoutes);

    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      console.error("Unhandled error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to bootstrap:", error);
    process.exit(1);
  }
}

bootstrap();

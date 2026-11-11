import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRouter from "./routes/ai.route.js";
import { randomUUID } from "node:crypto";

const app = express();
const PORT = process.env.PORT || 5000;


const allowedOrigins = [
  "http://localhost:5173",
  "https://cerealbox-ai-studio.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "1mb" }));

// Phase 1 uses in-memory storage so no database setup is needed yet.
const campaigns = [];

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    return `${field} is required`;
  }
  return null;
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "CerealBox AI Studio",
    aiMode: process.env.GEMINI_API_KEY?.trim() ? "gemini" : "not_configured"
  });
});

app.get("/api/campaigns", (_req, res) => {
  res.json(campaigns);
});

app.post("/api/campaigns", (req, res) => {
  const { name, client, objective, audience, offer } = req.body || {};
  for (const [value, field] of [
    [name, "Campaign name"],
    [client, "Client name"],
    [audience, "Target audience"],
    [offer, "Offer / key message"]
  ]) {
    const error = requireText(value, field);
    if (error) return res.status(400).json({ message: error });
  }

  const campaign = {
    id: randomUUID(),
    name: name.trim(),
    client: client.trim(),
    objective: objective || "Awareness",
    audience: audience.trim(),
    offer: offer.trim(),
    status: "Draft",
    createdAt: new Date().toISOString()
  };

  campaigns.unshift(campaign);
  res.status(201).json(campaign);
});

app.use("/api/ai", aiRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

app.listen(PORT, () => {
  console.log(`CerealBox API running at http://localhost:${PORT}`);
  console.log(`AI mode: ${process.env.GEMINI_API_KEY?.trim() ? "gemini" : "not_configured"}`);
});

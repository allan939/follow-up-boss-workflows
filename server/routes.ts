import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertSequenceSchema, insertScriptSchema, insertAgentSchema, insertActivityLogSchema } from "@shared/schema";

export function registerRoutes(httpServer: ReturnType<typeof createServer>, app: Express) {
  // ─── Sequences ─────────────────────────────────────────────────────────────
  app.get("/api/sequences", (_req, res) => {
    res.json(storage.getSequences());
  });

  app.get("/api/sequences/:id", (req, res) => {
    const seq = storage.getSequence(Number(req.params.id));
    if (!seq) return res.status(404).json({ error: "Not found" });
    res.json(seq);
  });

  app.post("/api/sequences", (req, res) => {
    const parsed = insertSequenceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createSequence(parsed.data));
  });

  app.patch("/api/sequences/:id", (req, res) => {
    const updated = storage.updateSequence(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/sequences/:id", (req, res) => {
    storage.deleteSequence(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Scripts ───────────────────────────────────────────────────────────────
  app.get("/api/scripts", (_req, res) => {
    res.json(storage.getScripts());
  });

  app.get("/api/scripts/sequence/:sequenceId", (req, res) => {
    res.json(storage.getScriptsBySequence(Number(req.params.sequenceId)));
  });

  app.get("/api/scripts/:id", (req, res) => {
    const script = storage.getScript(Number(req.params.id));
    if (!script) return res.status(404).json({ error: "Not found" });
    res.json(script);
  });

  app.post("/api/scripts", (req, res) => {
    const parsed = insertScriptSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createScript(parsed.data));
  });

  app.patch("/api/scripts/:id", (req, res) => {
    const updated = storage.updateScript(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/scripts/:id", (req, res) => {
    storage.deleteScript(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Agents ────────────────────────────────────────────────────────────────
  app.get("/api/agents", (_req, res) => {
    res.json(storage.getAgents());
  });

  app.post("/api/agents", (req, res) => {
    const parsed = insertAgentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createAgent(parsed.data));
  });

  app.patch("/api/agents/:id", (req, res) => {
    const updated = storage.updateAgent(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // ─── Activity ──────────────────────────────────────────────────────────────
  app.get("/api/activity", (req, res) => {
    const { date, agentId } = req.query;
    res.json(storage.getActivityLogs(
      date as string | undefined,
      agentId ? Number(agentId) : undefined
    ));
  });

  app.get("/api/activity/stats/:date", (req, res) => {
    res.json(storage.getDailyStats(req.params.date));
  });

  app.post("/api/activity", (req, res) => {
    const parsed = insertActivityLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.upsertActivityLog(parsed.data));
  });

  return httpServer;
}

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import type {
  Sequence, InsertSequence,
  Script, InsertScript,
  Agent, InsertAgent,
  ActivityLog, InsertActivityLog,
} from "@shared/schema";

const sqlite = new Database("db.sqlite");
export const db = drizzle(sqlite, { schema });

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trigger TEXT NOT NULL,
    trigger_tag TEXT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    steps_json TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    merge_fields TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'agent',
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    dials INTEGER NOT NULL DEFAULT 0,
    talk_time_minutes REAL NOT NULL DEFAULT 0,
    conversations INTEGER NOT NULL DEFAULT 0,
    appointments INTEGER NOT NULL DEFAULT 0,
    texts_sent INTEGER NOT NULL DEFAULT 0,
    emails_sent INTEGER NOT NULL DEFAULT 0,
    voicemails INTEGER NOT NULL DEFAULT 0,
    new_leads INTEGER NOT NULL DEFAULT 0,
    sequence_id INTEGER
  );
`);

export interface IStorage {
  // Sequences
  getSequences(): Sequence[];
  getSequence(id: number): Sequence | undefined;
  createSequence(data: InsertSequence): Sequence;
  updateSequence(id: number, data: Partial<InsertSequence>): Sequence | undefined;
  deleteSequence(id: number): void;
  // Scripts
  getScripts(): Script[];
  getScriptsBySequence(sequenceId: number): Script[];
  getScript(id: number): Script | undefined;
  createScript(data: InsertScript): Script;
  updateScript(id: number, data: Partial<InsertScript>): Script | undefined;
  deleteScript(id: number): void;
  // Agents
  getAgents(): Agent[];
  getAgent(id: number): Agent | undefined;
  createAgent(data: InsertAgent): Agent;
  updateAgent(id: number, data: Partial<InsertAgent>): Agent | undefined;
  // Activity
  getActivityLogs(date?: string, agentId?: number): ActivityLog[];
  getActivityLog(id: number): ActivityLog | undefined;
  upsertActivityLog(data: InsertActivityLog): ActivityLog;
  getDailyStats(date: string): { dials: number; talkTime: number; conversations: number; appointments: number; contactRate: number };
}

function nowMs() { return Date.now(); }

class SqliteStorage implements IStorage {
  // ─── Sequences ────────────────────────────────────────────────────────────
  getSequences(): Sequence[] {
    return db.select().from(schema.sequences).orderBy(desc(schema.sequences.createdAt)).all();
  }
  getSequence(id: number): Sequence | undefined {
    return db.select().from(schema.sequences).where(eq(schema.sequences.id, id)).get();
  }
  createSequence(data: InsertSequence): Sequence {
    return db.insert(schema.sequences).values({ ...data, createdAt: nowMs() }).returning().get();
  }
  updateSequence(id: number, data: Partial<InsertSequence>): Sequence | undefined {
    return db.update(schema.sequences).set(data).where(eq(schema.sequences.id, id)).returning().get();
  }
  deleteSequence(id: number): void {
    db.delete(schema.sequences).where(eq(schema.sequences.id, id)).run();
  }

  // ─── Scripts ──────────────────────────────────────────────────────────────
  getScripts(): Script[] {
    return db.select().from(schema.scripts).orderBy(desc(schema.scripts.createdAt)).all();
  }
  getScriptsBySequence(sequenceId: number): Script[] {
    return db.select().from(schema.scripts).where(eq(schema.scripts.sequenceId, sequenceId)).all();
  }
  getScript(id: number): Script | undefined {
    return db.select().from(schema.scripts).where(eq(schema.scripts.id, id)).get();
  }
  createScript(data: InsertScript): Script {
    return db.insert(schema.scripts).values({ ...data, createdAt: nowMs() }).returning().get();
  }
  updateScript(id: number, data: Partial<InsertScript>): Script | undefined {
    return db.update(schema.scripts).set(data).where(eq(schema.scripts.id, id)).returning().get();
  }
  deleteScript(id: number): void {
    db.delete(schema.scripts).where(eq(schema.scripts.id, id)).run();
  }

  // ─── Agents ───────────────────────────────────────────────────────────────
  getAgents(): Agent[] {
    return db.select().from(schema.agents).all();
  }
  getAgent(id: number): Agent | undefined {
    return db.select().from(schema.agents).where(eq(schema.agents.id, id)).get();
  }
  createAgent(data: InsertAgent): Agent {
    return db.insert(schema.agents).values(data).returning().get();
  }
  updateAgent(id: number, data: Partial<InsertAgent>): Agent | undefined {
    return db.update(schema.agents).set(data).where(eq(schema.agents.id, id)).returning().get();
  }

  // ─── Activity ─────────────────────────────────────────────────────────────
  getActivityLogs(date?: string, agentId?: number): ActivityLog[] {
    let q = db.select().from(schema.activityLogs);
    if (date && agentId) {
      return db.select().from(schema.activityLogs)
        .where(and(eq(schema.activityLogs.date, date), eq(schema.activityLogs.agentId, agentId))).all();
    }
    if (date) {
      return db.select().from(schema.activityLogs).where(eq(schema.activityLogs.date, date)).all();
    }
    if (agentId) {
      return db.select().from(schema.activityLogs).where(eq(schema.activityLogs.agentId, agentId)).all();
    }
    return db.select().from(schema.activityLogs).orderBy(desc(schema.activityLogs.date)).all();
  }
  getActivityLog(id: number): ActivityLog | undefined {
    return db.select().from(schema.activityLogs).where(eq(schema.activityLogs.id, id)).get();
  }
  upsertActivityLog(data: InsertActivityLog): ActivityLog {
    const existing = db.select().from(schema.activityLogs)
      .where(and(eq(schema.activityLogs.agentId, data.agentId), eq(schema.activityLogs.date, data.date))).get();
    if (existing) {
      return db.update(schema.activityLogs).set(data).where(eq(schema.activityLogs.id, existing.id)).returning().get()!;
    }
    return db.insert(schema.activityLogs).values(data).returning().get();
  }
  getDailyStats(date: string) {
    const logs = this.getActivityLogs(date);
    const dials = logs.reduce((s, l) => s + l.dials, 0);
    const conversations = logs.reduce((s, l) => s + l.conversations, 0);
    const talkTime = logs.reduce((s, l) => s + l.talkTimeMinutes, 0);
    const appointments = logs.reduce((s, l) => s + l.appointments, 0);
    const contactRate = dials > 0 ? Math.round((conversations / dials) * 100) : 0;
    return { dials, talkTime, conversations, appointments, contactRate };
  }
}

export const storage = new SqliteStorage();

// Seed default data if empty
function seedIfEmpty() {
  const existing = db.select().from(schema.sequences).all();
  if (existing.length > 0) return;

  const now = Date.now();

  // Seed 10 sequences
  const seqs = [
    {
      name: "Cold Lead Follow-Up",
      trigger: "Lead added with no response for 48h",
      triggerTag: "cold-lead",
      description: "Multi-touch drip for unresponsive leads over 30 days",
      category: "cold_lead",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Initial Text" },
        { day: 1, type: "call", label: "First Call Attempt" },
        { day: 3, type: "email", label: "Value Email" },
        { day: 7, type: "sms", label: "Check-In Text" },
        { day: 14, type: "voicemail", label: "Voicemail Drop" },
        { day: 30, type: "email", label: "Long-Term Nurture" },
      ]),
      createdAt: now,
    },
    {
      name: "Handraiser Tag — Hot Lead",
      trigger: "Tag 'handraiser' added to lead",
      triggerTag: "handraiser",
      description: "Immediate high-touch response when lead signals intent",
      category: "handraiser",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "call", label: "Immediate Call (5 min)" },
        { day: 0, type: "sms", label: "Speed Text" },
        { day: 1, type: "call", label: "Follow-Up Call" },
        { day: 2, type: "email", label: "Personalized Email" },
      ]),
      createdAt: now,
    },
    {
      name: "Nurture Past Clients",
      trigger: "Contact tagged 'past-client'",
      triggerTag: "past-client",
      description: "Annual touchpoints to stay top of mind with closed clients",
      category: "past_client",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Welcome Back Text" },
        { day: 30, type: "email", label: "Market Update" },
        { day: 90, type: "call", label: "Quarterly Check-In" },
        { day: 180, type: "email", label: "Home Value Report" },
        { day: 365, type: "sms", label: "Anniversary Text" },
      ]),
      createdAt: now,
    },
    {
      name: "Referral Intro Sequence",
      trigger: "Lead source = 'Referral'",
      triggerTag: "referral",
      description: "Warm intro sequence for referred leads",
      category: "referral",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Referral Welcome Text" },
        { day: 0, type: "call", label: "Intro Call" },
        { day: 1, type: "email", label: "Referral Thank You + Bio" },
        { day: 3, type: "sms", label: "Listing Preferences Ask" },
        { day: 7, type: "call", label: "Consultation Invite" },
      ]),
      createdAt: now,
    },
    {
      name: "Speed-to-Lead (5-Min Rule)",
      trigger: "New lead created from any source",
      triggerTag: null,
      description: "Instant response sequence — first 5 minutes are critical",
      category: "speed_to_lead",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Instant Text (0–2 min)" },
        { day: 0, type: "call", label: "First Call (5 min)" },
        { day: 0, type: "voicemail", label: "Voicemail Drop" },
        { day: 0, type: "email", label: "Intro Email" },
        { day: 1, type: "call", label: "Morning Call" },
      ]),
      createdAt: now,
    },
    {
      name: "Listing Alert Engagement",
      trigger: "Lead opens listing alert email",
      triggerTag: "listing-opened",
      description: "Follow-up when a lead engages with a listing alert",
      category: "listing_engagement",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Seen the Listing Text" },
        { day: 1, type: "call", label: "Call to Schedule Tour" },
        { day: 2, type: "email", label: "Similar Listings Email" },
        { day: 5, type: "sms", label: "Price Drop Alert Text" },
      ]),
      createdAt: now,
    },
    {
      name: "Stale Pipeline Revival",
      trigger: "No activity in 30 days",
      triggerTag: "stale-30",
      description: "Re-engage leads who have gone quiet at 30/60/90 day marks",
      category: "revival",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "30-Day Check-In Text" },
        { day: 3, type: "call", label: "Re-Engagement Call" },
        { day: 7, type: "email", label: "Market Snapshot Email" },
        { day: 30, type: "sms", label: "60-Day Touch" },
        { day: 60, type: "email", label: "90-Day Breakup Email" },
      ]),
      createdAt: now,
    },
    {
      name: "Open House Follow-Up",
      trigger: "Lead tagged 'open-house-visitor'",
      triggerTag: "open-house-visitor",
      description: "Post-event nurture for open house attendees",
      category: "open_house",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Same-Day Thank You Text" },
        { day: 1, type: "email", label: "Recap + Similar Homes" },
        { day: 3, type: "call", label: "Follow-Up Call" },
        { day: 7, type: "sms", label: "Week-After Check-In" },
        { day: 14, type: "email", label: "Market Update" },
      ]),
      createdAt: now,
    },
    {
      name: "Price Drop Alert",
      trigger: "Watched listing price drops",
      triggerTag: "price-drop",
      description: "Notify and follow up when a lead's saved listing drops in price",
      category: "price_drop",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Price Drop Alert Text" },
        { day: 0, type: "email", label: "Price Drop Email" },
        { day: 1, type: "call", label: "Urgency Call" },
        { day: 2, type: "sms", label: "Tour Invite Text" },
      ]),
      createdAt: now,
    },
    {
      name: "Closed Deal Anniversary",
      trigger: "Anniversary of closing date",
      triggerTag: "closed-anniversary",
      description: "Yearly touchpoint to celebrate anniversaries and generate referrals",
      category: "anniversary",
      isActive: true,
      stepsJson: JSON.stringify([
        { day: 0, type: "sms", label: "Anniversary Text" },
        { day: 0, type: "email", label: "Anniversary Email + Home Value" },
        { day: 3, type: "call", label: "Personal Call" },
        { day: 7, type: "sms", label: "Referral Request Text" },
      ]),
      createdAt: now,
    },
  ];

  for (const s of seqs) {
    db.insert(schema.sequences).values(s).run();
  }

  // Seed scripts
  const scripts = [
    // Cold lead
    {
      sequenceId: 1, name: "Cold Lead Initial Text", type: "sms", subject: null,
      body: "Hi [Name], this is [Your Name] checking on your home search in [Area]. Still looking? Happy to send over some fresh listings. 🏡",
      mergeFields: JSON.stringify(["Name", "Your Name", "Area"]), category: "cold_lead", createdAt: now,
    },
    {
      sequenceId: 1, name: "Cold Lead Value Email", type: "email",
      subject: "Quick update on [Area] — homes you might love",
      body: "Hi [Name],\n\nI wanted to reach out with a quick market update for [Area]. I've been watching listings closely and a few new homes just came on that match what you were looking for.\n\nAre you still actively searching, or has your timeline shifted? Either way, no pressure — just want to make sure you're seeing the best options.\n\nLet me know a good time to connect!\n\n[Your Name]\n[Your Phone]",
      mergeFields: JSON.stringify(["Name", "Area", "Your Name", "Your Phone"]), category: "cold_lead", createdAt: now,
    },
    // Handraiser
    {
      sequenceId: 2, name: "Handraiser Speed Text", type: "sms", subject: null,
      body: "Hi [Name]! This is [Your Name] from [Brokerage]. Looks like you found something you love — I'm calling you right now. Talk soon!",
      mergeFields: JSON.stringify(["Name", "Your Name", "Brokerage"]), category: "handraiser", createdAt: now,
    },
    {
      sequenceId: 2, name: "Handraiser Personalized Email", type: "email",
      subject: "[Address] — let's make this happen",
      body: "Hi [Name],\n\nThank you for your interest in [Address]! I just tried calling you — I'd love to get you inside this home before it's gone.\n\nHere's what I know about this property:\n• Listed at [Price]\n• [Beds] beds / [Baths] baths\n• [Square Feet] sq ft\n\nI have availability [Available Times] for a showing. Would any of those work for you?\n\nLooking forward to helping you!\n\n[Your Name]",
      mergeFields: JSON.stringify(["Name", "Address", "Price", "Beds", "Baths", "Square Feet", "Available Times", "Your Name"]), category: "handraiser", createdAt: now,
    },
    // Referral
    {
      sequenceId: 4, name: "Referral Welcome Text", type: "sms", subject: null,
      body: "Hi [Name], this is [Your Name]! [Referrer Name] mentioned you're looking to [Buy/Sell] in [Area]. I'd love to help — when's a good time for a quick call?",
      mergeFields: JSON.stringify(["Name", "Your Name", "Referrer Name", "Buy/Sell", "Area"]), category: "referral", createdAt: now,
    },
    {
      sequenceId: 4, name: "Referral Bio + Thank You Email", type: "email",
      subject: "Nice to meet you, [Name] — referred by [Referrer Name]",
      body: "Hi [Name],\n\nSo great to connect! [Referrer Name] speaks very highly of you, and I'm excited to help you with your real estate goals in [Area].\n\nA little about me: I've been working in [Area] for [Years] years and have helped over [Transactions] families buy and sell homes. My approach is straightforward — no pressure, just good data and honest advice.\n\nI'd love to schedule a 15-minute call this week to learn more about what you're looking for. Here's a link to my calendar: [Calendar Link]\n\nLooking forward to it!\n\n[Your Name]\n[Your Phone] | [Your Email]",
      mergeFields: JSON.stringify(["Name", "Referrer Name", "Area", "Years", "Transactions", "Calendar Link", "Your Name", "Your Phone", "Your Email"]), category: "referral", createdAt: now,
    },
    // Past client
    {
      sequenceId: 3, name: "Past Client Anniversary Text", type: "sms", subject: null,
      body: "Hi [Name]! This is [Your Name] — can you believe it's been [Years] year(s) since you closed on [Address]? Hope you're loving it! If you ever need anything or know someone looking to buy or sell, I'm always here. 🏡",
      mergeFields: JSON.stringify(["Name", "Your Name", "Years", "Address"]), category: "past_client", createdAt: now,
    },
    // Speed to lead
    {
      sequenceId: 5, name: "Speed-to-Lead Instant Text", type: "sms", subject: null,
      body: "Hi [Name], this is [Your Name] — I just received your request and I'm calling you right now! If I miss you, text me back anytime. 📞",
      mergeFields: JSON.stringify(["Name", "Your Name"]), category: "speed_to_lead", createdAt: now,
    },
    // Open house
    {
      sequenceId: 8, name: "Open House Thank You Text", type: "sms", subject: null,
      body: "Hi [Name]! Great meeting you at the open house at [Address] today. What did you think? I have a few similar homes I think you'd love — want me to send them over?",
      mergeFields: JSON.stringify(["Name", "Address"]), category: "open_house", createdAt: now,
    },
    // Price drop
    {
      sequenceId: 9, name: "Price Drop Alert Text", type: "sms", subject: null,
      body: "🚨 [Name] — the price just dropped on [Address]! It's now at [New Price] (was [Old Price]). This one won't last long. Want to schedule a tour today?",
      mergeFields: JSON.stringify(["Name", "Address", "New Price", "Old Price"]), category: "price_drop", createdAt: now,
    },
    // Revival
    {
      sequenceId: 7, name: "Stale Lead Re-Engagement Text", type: "sms", subject: null,
      body: "Hi [Name], this is [Your Name] — it's been a while! Still thinking about [Buy/Sell/Moving] in [Area]? The market has shifted and I'd love to catch you up. 5 mins?",
      mergeFields: JSON.stringify(["Name", "Your Name", "Buy/Sell/Moving", "Area"]), category: "revival", createdAt: now,
    },
    {
      sequenceId: 7, name: "90-Day Breakup Email", type: "email",
      subject: "Should I stop reaching out, [Name]?",
      body: "Hi [Name],\n\nI've reached out a few times and haven't heard back — totally understand, life gets busy!\n\nI want to be respectful of your time, so I'll only reach out one more time after this. If your plans have changed or you're working with another agent, no hard feelings at all.\n\nBut if you're still thinking about [Area] and want a fresh perspective on the market, just reply 'yes' and I'll be in touch.\n\nEither way, wishing you the best!\n\n[Your Name]",
      mergeFields: JSON.stringify(["Name", "Area", "Your Name"]), category: "revival", createdAt: now,
    },
    // Anniversary
    {
      sequenceId: 10, name: "Closed Anniversary Email", type: "email",
      subject: "Happy [Years]-Year Homeversary, [Name]! 🏡",
      body: "Hi [Name],\n\nI can't believe it's already been [Years] year(s) since you closed on [Address]! Wishing you another wonderful year in your home.\n\nAs a little gift, I pulled your current estimated home value: [Estimated Value] — up [Appreciation]% since you purchased!\n\nIf you're curious about what your home would sell for in today's market, or if you know anyone looking to buy or sell, I'd love to help.\n\nHappy homeversary!\n\n[Your Name]",
      mergeFields: JSON.stringify(["Name", "Years", "Address", "Estimated Value", "Appreciation", "Your Name"]), category: "anniversary", createdAt: now,
    },
  ];

  for (const s of scripts) {
    db.insert(schema.scripts).values(s).run();
  }

  // Seed agents
  const agentData = [
    { name: "Sarah Mitchell", email: "sarah@realty.com", phone: "512-555-0101", role: "team_lead", isActive: true },
    { name: "James Rodriguez", email: "james@realty.com", phone: "512-555-0102", role: "agent", isActive: true },
    { name: "Priya Kapoor", email: "priya@realty.com", phone: "512-555-0103", role: "agent", isActive: true },
    { name: "Marcus Thompson", email: "marcus@realty.com", phone: "512-555-0104", role: "agent", isActive: true },
  ];
  for (const a of agentData) {
    db.insert(schema.agents).values(a).run();
  }

  // Seed activity logs for last 7 days
  const today = new Date();
  const agentIds = [1, 2, 3, 4];
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    for (const agentId of agentIds) {
      const base = agentId === 1 ? 1.3 : agentId === 2 ? 1.0 : agentId === 3 ? 0.9 : 0.75;
      const dials = Math.round((30 + Math.random() * 40) * base);
      const conversations = Math.round(dials * (0.15 + Math.random() * 0.1));
      db.insert(schema.activityLogs).values({
        agentId,
        date: dateStr,
        dials,
        talkTimeMinutes: Math.round(conversations * (3 + Math.random() * 5) * 10) / 10,
        conversations,
        appointments: Math.round(conversations * (0.2 + Math.random() * 0.15)),
        textsSent: Math.round((15 + Math.random() * 25) * base),
        emailsSent: Math.round((10 + Math.random() * 20) * base),
        voicemails: Math.round((5 + Math.random() * 15) * base),
        newLeads: Math.round((2 + Math.random() * 6) * base),
        sequenceId: null,
      }).run();
    }
  }
}

seedIfEmpty();

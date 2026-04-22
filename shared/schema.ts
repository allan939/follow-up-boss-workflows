import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Sequences ───────────────────────────────────────────────────────────────
export const sequences = sqliteTable("sequences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  triggerTag: text("trigger_tag"),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'cold_lead' | 'handraiser' | 'past_client' | 'referral' | 'speed_to_lead' | 'listing_engagement' | 'revival' | 'open_house' | 'price_drop' | 'anniversary'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  stepsJson: text("steps_json").notNull().default("[]"), // JSON array of step objects
  createdAt: integer("created_at").notNull().default(0),
});

export const insertSequenceSchema = createInsertSchema(sequences).omit({ id: true, createdAt: true });
export type InsertSequence = z.infer<typeof insertSequenceSchema>;
export type Sequence = typeof sequences.$inferSelect;

// ─── Scripts ─────────────────────────────────────────────────────────────────
export const scripts = sqliteTable("scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sequenceId: integer("sequence_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'sms' | 'email' | 'voicemail' | 'call'
  subject: text("subject"),
  body: text("body").notNull(),
  mergeFields: text("merge_fields").notNull().default("[]"), // JSON array of field names
  category: text("category").notNull(),
  createdAt: integer("created_at").notNull().default(0),
});

export const insertScriptSchema = createInsertSchema(scripts).omit({ id: true, createdAt: true });
export type InsertScript = z.infer<typeof insertScriptSchema>;
export type Script = typeof scripts.$inferSelect;

// ─── Agents ──────────────────────────────────────────────────────────────────
export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("agent"), // 'agent' | 'team_lead'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// ─── Activity Logs ────────────────────────────────────────────────────────────
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  dials: integer("dials").notNull().default(0),
  talkTimeMinutes: real("talk_time_minutes").notNull().default(0),
  conversations: integer("conversations").notNull().default(0),
  appointments: integer("appointments").notNull().default(0),
  textsSent: integer("texts_sent").notNull().default(0),
  emailsSent: integer("emails_sent").notNull().default(0),
  voicemails: integer("voicemails").notNull().default(0),
  newLeads: integer("new_leads").notNull().default(0),
  sequenceId: integer("sequence_id"),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

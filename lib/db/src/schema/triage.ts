import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const triageSessionsTable = pgTable("triage_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  symptoms: text("symptoms").notNull(),
  urgencyLevel: text("urgency_level").notNull(),
  specialistRecommended: text("specialist_recommended").notNull(),
  careSuggestion: text("care_suggestion").notNull(),
  aiSummary: text("ai_summary"),
  disclaimer: text("disclaimer").notNull().default("This is not a medical diagnosis. Please consult a certified doctor for proper diagnosis and treatment."),
  linkedReportId: integer("linked_report_id"),
  linkedAppointmentId: integer("linked_appointment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTriageSessionSchema = createInsertSchema(triageSessionsTable).omit({ id: true, createdAt: true });
export type InsertTriageSession = z.infer<typeof insertTriageSessionSchema>;
export type TriageSession = typeof triageSessionsTable.$inferSelect;

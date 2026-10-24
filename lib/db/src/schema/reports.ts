import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicalReportsTable = pgTable("medical_reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  reportType: text("report_type").notNull(),
  title: text("title").notNull(),
  rawText: text("raw_text"),
  simplifiedText: text("simplified_text"),
  abnormalValues: text("abnormal_values"),
  specialistSuggestion: text("specialist_suggestion"),
  linkedTriageId: integer("linked_triage_id"),
  linkedAppointmentId: integer("linked_appointment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMedicalReportSchema = createInsertSchema(medicalReportsTable).omit({ id: true, createdAt: true });
export type InsertMedicalReport = z.infer<typeof insertMedicalReportSchema>;
export type MedicalReport = typeof medicalReportsTable.$inferSelect;

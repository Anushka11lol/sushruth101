import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicationsTable = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  timings: text("timings"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  prescribedBy: text("prescribed_by"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMedicationSchema = createInsertSchema(medicationsTable).omit({ id: true, createdAt: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medicationsTable.$inferSelect;

export const medicationLogsTable = pgTable("medication_logs", {
  id: serial("id").primaryKey(),
  medicationId: integer("medication_id").notNull(),
  userId: text("user_id").notNull(),
  takenAt: timestamp("taken_at").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogsTable).omit({ id: true, createdAt: true });
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
export type MedicationLog = typeof medicationLogsTable.$inferSelect;

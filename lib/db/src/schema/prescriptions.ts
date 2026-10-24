import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prescriptionsTable = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  prescriberName: text("prescriber_name"),
  prescriptionDate: text("prescription_date"),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  isHandwritten: boolean("is_handwritten").notNull().default(false),
  overallConfidence: integer("overall_confidence"),
  warnings: text("warnings").notNull().default("[]"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  status: text("status").notNull().default("reviewed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const prescriptionMedicationItemsTable = pgTable("prescription_medication_items", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull(),
  medicationName: text("medication_name").notNull(),
  strength: text("strength"),
  dosage: text("dosage"),
  frequency: text("frequency"),
  duration: text("duration"),
  instructions: text("instructions"),
  confidence: integer("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptionsTable.$inferSelect;
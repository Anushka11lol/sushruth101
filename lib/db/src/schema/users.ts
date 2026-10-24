import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthRecordsTable = pgTable("health_records", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  bloodGroup: text("blood_group"),
  allergies: text("allergies"),
  chronicConditions: text("chronic_conditions"),
  currentMedications: text("current_medications"),
  emergencyContact: text("emergency_contact"),
  height: numeric("height"),
  weight: numeric("weight"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inserHealthRecordSchema = createInsertSchema(healthRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHealthRecord = z.infer<typeof inserHealthRecordSchema>;
export type HealthRecord = typeof healthRecordsTable.$inferSelect;

export const surgeriesTable = pgTable("surgeries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  procedureName: text("procedure_name").notNull(),
  date: text("date").notNull(),
  hospital: text("hospital"),
  surgeon: text("surgeon"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSurgerySchema = createInsertSchema(surgeriesTable).omit({ id: true, createdAt: true });
export type InsertSurgery = z.infer<typeof insertSurgerySchema>;
export type Surgery = typeof surgeriesTable.$inferSelect;

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  hospital: text("hospital").notNull(),
  city: text("city").notNull(),
  fees: numeric("fees").notNull(),
  rating: numeric("rating").notNull(),
  avatarUrl: text("avatar_url"),
  availableSlots: text("available_slots").notNull().default("[]"),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;

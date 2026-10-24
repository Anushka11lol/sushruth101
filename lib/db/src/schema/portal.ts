import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalRoles = ["patient", "doctor", "frontline_worker", "facility_admin"] as const;

export const portalProfilesTable = pgTable("portal_profiles", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull().unique(), portalRole: text("portal_role").notNull().default("patient"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const preConsultationSubmissionsTable = pgTable("pre_consultation_submissions", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull(), patientName: text("patient_name").notNull(), language: text("language").notNull(),
  intakeData: jsonb("intake_data").notNull(), status: text("status").notNull().default("pending"), doctorUserId: text("doctor_user_id"),
  doctorNotes: text("doctor_notes"), verificationStates: jsonb("verification_states").notNull().default({}),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(), reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});
export const insertPortalProfileSchema = createInsertSchema(portalProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortalProfile = z.infer<typeof insertPortalProfileSchema>;
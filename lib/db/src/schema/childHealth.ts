import { pgTable, text, serial, timestamp, date, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const childProfilesTable = pgTable("child_profiles", {
  id: serial("id").primaryKey(), name: text("name").notNull(), dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
  sex: text("sex"), bloodGroup: text("blood_group"), notes: text("notes"), createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const childGuardiansTable = pgTable("child_guardians", {
  id: serial("id").primaryKey(), childProfileId: integer("child_profile_id").notNull(), userId: text("user_id").notNull(),
  relationship: text("relationship").notNull().default("Parent"), accessLevel: text("access_level").notNull().default("manage"),
  status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("child_guardian_unique").on(t.childProfileId, t.userId)]);
export const immunizationRecordsTable = pgTable("immunization_records", {
  id: serial("id").primaryKey(), childProfileId: integer("child_profile_id").notNull(), vaccineName: text("vaccine_name").notNull(),
  doseLabel: text("dose_label").notNull(), dueDate: date("due_date", { mode: "string" }), administeredDate: date("administered_date", { mode: "string" }),
  status: text("status").notNull().default("scheduled"), scheduleType: text("schedule_type").notNull().default("UIP"),
  recommendedAge: text("recommended_age"), recommendedWindow: text("recommended_window"), purpose: text("purpose"),
  notApplicableReason: text("not_applicable_reason"), reminder7Days: boolean("reminder_7_days").notNull().default(false),
  reminder3Days: boolean("reminder_3_days").notNull().default(false), reminder1Day: boolean("reminder_1_day").notNull().default(false),
  provider: text("provider"), notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertChildProfileSchema = createInsertSchema(childProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChildProfile = z.infer<typeof insertChildProfileSchema>;
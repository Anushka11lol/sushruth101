import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const workerTypes = ["ASHA", "ANM", "COMMUNITY_HEALTH_WORKER", "OTHER"] as const;
export const professionalVerificationStatuses = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED", "UPDATE_REQUIRED"] as const;
export const associationStatuses = ["PENDING", "APPROVED", "REJECTED", "REMOVED"] as const;

export const healthWorkerRegistrationsTable = pgTable("health_worker_registrations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  photoPath: text("photo_path"),
  workerType: text("worker_type").notNull(),
  workerId: text("worker_id"),
  training: text("training"),
  languages: text("languages").array(),
  yearsExperience: integer("years_experience"),
  facilityId: integer("facility_id").notNull(),
  department: text("department"),
  areaServed: text("area_served"),
  professionalStatus: text("professional_status").notNull().default("PENDING"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const facilityAssociationRequestsTable = pgTable("facility_association_requests", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").notNull(),
  userId: text("user_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  rejectionReason: text("rejection_reason"),
  actedByUserId: text("acted_by_user_id"),
  actedAt: timestamp("acted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const healthWorkerRegistrationHistoryTable = pgTable("health_worker_registration_history", {
  id: serial("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  action: text("action").notNull(),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHealthWorkerRegistrationSchema = createInsertSchema(healthWorkerRegistrationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type HealthWorkerRegistration = typeof healthWorkerRegistrationsTable.$inferSelect;
export type InsertHealthWorkerRegistration = z.infer<typeof insertHealthWorkerRegistrationSchema>;
import { pgTable, text, serial, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const careCircleMembersTable = pgTable("care_circle_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberName: text("member_name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone"),
  email: text("email"),
  linkedUserId: text("linked_user_id"),
  careRole: text("care_role"),
  verificationStatus: text("verification_status").notNull().default("not_started"),
  healthStatus: text("health_status"),
  lastSeen: text("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareCircleMemberSchema = createInsertSchema(careCircleMembersTable).omit({ id: true, createdAt: true });
export type InsertCareCircleMember = z.infer<typeof insertCareCircleMemberSchema>;
export type CareCircleMember = typeof careCircleMembersTable.$inferSelect;

export const careCircleConnectionsTable = pgTable("care_circle_connections", {
  id: serial("id").primaryKey(),
  requesterUserId: text("requester_user_id").notNull(),
  requesterName: text("requester_name").notNull(),
  recipientUserId: text("recipient_user_id").notNull(),
  recipientName: text("recipient_name"),
  relationship: text("relationship"),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const emergencyAlertsTable = pgTable("emergency_alerts", {
  id: serial("id").primaryKey(),
  patientUserId: text("patient_user_id").notNull(),
  patientName: text("patient_name").notNull(),
  sushruthId: text("sushruth_id").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  accuracyMeters: integer("accuracy_meters"),
  status: text("status").notNull().default("SENT"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const careCircleEmergencyRecipientsTable = pgTable("care_circle_emergency_recipients", {
  id: serial("id").primaryKey(),
  emergencyAlertId: integer("emergency_alert_id").notNull(),
  recipientUserId: text("recipient_user_id").notNull(),
  recipientName: text("recipient_name").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  seenAt: timestamp("seen_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
});

export const careAlertsTable = pgTable("care_alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberId: integer("member_id"),
  memberName: text("member_name"),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareAlertSchema = createInsertSchema(careAlertsTable).omit({ id: true, createdAt: true });
export type InsertCareAlert = z.infer<typeof insertCareAlertSchema>;
export type CareAlert = typeof careAlertsTable.$inferSelect;

export const careCircleVaultItemsTable = pgTable("care_circle_vault_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberId: integer("member_id").notNull(),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareCircleVaultItemSchema = createInsertSchema(careCircleVaultItemsTable).omit({ id: true, createdAt: true });
export type InsertCareCircleVaultItem = z.infer<typeof insertCareCircleVaultItemSchema>;
export type CareCircleVaultItem = typeof careCircleVaultItemsTable.$inferSelect;

export const careCircleIdentityVerificationsTable = pgTable("care_circle_identity_verifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberId: integer("member_id").notNull(),
  legalName: text("legal_name").notNull(),
  documentType: text("document_type").notNull(),
  documentLast4: text("document_last4").notNull(),
  documentVaultItemId: integer("document_vault_item_id"),
  status: text("status").notNull().default("pending_review"),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertCareCircleIdentityVerificationSchema = createInsertSchema(careCircleIdentityVerificationsTable).omit({ id: true, submittedAt: true, reviewedAt: true });
export type InsertCareCircleIdentityVerification = z.infer<typeof insertCareCircleIdentityVerificationSchema>;
export type CareCircleIdentityVerification = typeof careCircleIdentityVerificationsTable.$inferSelect;

export const careCircleDutiesTable = pgTable("care_circle_duties", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberId: integer("member_id").notNull(),
  assignedToMemberId: integer("assigned_to_member_id"),
  title: text("title").notNull(),
  category: text("category").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  instructions: text("instructions"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareCircleDutySchema = createInsertSchema(careCircleDutiesTable).omit({ id: true, createdAt: true });
export type InsertCareCircleDuty = z.infer<typeof insertCareCircleDutySchema>;
export type CareCircleDuty = typeof careCircleDutiesTable.$inferSelect;

export const careCircleDailyCareLogsTable = pgTable("care_circle_daily_care_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  memberId: integer("member_id").notNull(),
  dutyId: integer("duty_id"),
  careDate: date("care_date", { mode: "string" }).notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCareCircleDailyCareLogSchema = createInsertSchema(careCircleDailyCareLogsTable).omit({ id: true, createdAt: true });
export type InsertCareCircleDailyCareLog = z.infer<typeof insertCareCircleDailyCareLogSchema>;
export type CareCircleDailyCareLog = typeof careCircleDailyCareLogsTable.$inferSelect;

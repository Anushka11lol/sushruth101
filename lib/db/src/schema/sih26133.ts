import { createInsertSchema } from "drizzle-zod";
import { jsonb, integer, numeric, pgTable, serial, text, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const audit = { createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()) };

export const registeredPatientsTable = pgTable("registered_patients", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull().unique(), name: text("name").notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }), age: integer("age"), sex: text("sex"), phone: text("phone"), address: text("address"),
  preferredLanguage: text("preferred_language"), emergencyContact: text("emergency_contact"), sushruthId: text("sushruth_id").notNull().unique(), normalizedPhone: text("normalized_phone"), normalizedSushruthId: text("normalized_sushruth_id"),
  registeredByUserId: text("registered_by_user_id").notNull(), facilityId: integer("facility_id"), ...audit,
 }, (t) => ({ normalizedPhoneUnique: uniqueIndex("registered_patients_normalized_phone_unique").on(t.normalizedPhone), normalizedSushruthUnique: uniqueIndex("registered_patients_normalized_sushruth_unique").on(t.normalizedSushruthId) }));
export const facilitiesTable = pgTable("facilities", {
  id: serial("id").primaryKey(), code: text("code").notNull().unique(), name: text("name").notNull(), type: text("type").notNull(),
  address: text("address"), city: text("city"), phone: text("phone"), latitude: numeric("latitude"), longitude: numeric("longitude"), active: text("active").notNull().default("true"), ...audit,
});
export const facilityMembershipsTable = pgTable("facility_memberships", {
  id: serial("id").primaryKey(), facilityId: integer("facility_id").notNull(), userId: text("user_id").notNull(), role: text("role").notNull(), active: text("active").notNull().default("true"), ...audit,
}, (t) => ({ membershipUnique: uniqueIndex("facility_membership_unique").on(t.facilityId, t.userId) }));
export const healthWorkerProfilesTable = pgTable("health_worker_profiles", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull().unique(), workerType: text("worker_type").notNull(), facilityId: integer("facility_id"), registrationNumber: text("registration_number"), phone: text("phone"), active: text("active").notNull().default("true"), ...audit,
});
export const vitalsTable = pgTable("vitals", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull(), facilityId: integer("facility_id"), recordedByUserId: text("recorded_by_user_id").notNull(), source: text("source").notNull().default("worker_recorded"), values: jsonb("values").notNull(), recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(), ...audit,
});
export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(), referralNumber: text("referral_number").notNull().unique(), patientUserId: text("patient_user_id").notNull(), referringFacilityId: integer("referring_facility_id"),
  destinationFacilityId: integer("destination_facility_id"), referringUserId: text("referring_user_id").notNull(), reason: text("reason").notNull(), chiefComplaint: text("chief_complaint"),
  relevantHistory: text("relevant_history"), priority: text("priority").notNull().default("NORMAL"), specialty: text("specialty"), requiredInvestigation: text("required_investigation"), referralDate: date("referral_date", { mode: "string" }).notNull(), expectedDate: date("expected_date", { mode: "string" }), notes: text("notes"), status: text("status").notNull().default("CREATED"), ...audit,
});
export const referralStatusHistoryTable = pgTable("referral_status_history", {
  id: serial("id").primaryKey(), referralId: integer("referral_id").notNull(), previousStatus: text("previous_status"), newStatus: text("new_status").notNull(), changedByUserId: text("changed_by_user_id").notNull(), note: text("note"), changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
export const followUpTasksTable = pgTable("follow_up_tasks", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull(), assignedToUserId: text("assigned_to_user_id"), facilityId: integer("facility_id"), referralId: integer("referral_id"), reason: text("reason").notNull(), dueDate: date("due_date", { mode: "string" }).notNull(), priority: text("priority").notNull().default("NORMAL"), status: text("status").notNull().default("PENDING"), outcome: text("outcome"), notes: text("notes"), completedByUserId: text("completed_by_user_id"), completedAt: timestamp("completed_at", { withTimezone: true }), ...audit,
});
export const facilityInventoryTable = pgTable("facility_inventory", {
  id: serial("id").primaryKey(), facilityId: integer("facility_id").notNull(), medicineName: text("medicine_name").notNull(), genericName: text("generic_name"), strength: text("strength"), dosageForm: text("dosage_form"), quantity: integer("quantity").notNull().default(0), minimumStock: integer("minimum_stock").notNull().default(0), updatedByUserId: text("updated_by_user_id").notNull(), ...audit,
});
export const maternalProfilesTable = pgTable("maternal_profiles", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull().unique(), pregnancyStatus: text("pregnancy_status").notNull(), registrationDate: date("registration_date", { mode: "string" }), gestationalInfo: text("gestational_info"), expectedDeliveryDate: date("expected_delivery_date", { mode: "string" }), nextFollowUpDate: date("next_follow_up_date", { mode: "string" }), lastVisitDate: date("last_visit_date", { mode: "string" }), pendingInvestigation: text("pending_investigation"), riskFlags: jsonb("risk_flags").notNull().default([]), recordedByUserId: text("recorded_by_user_id").notNull(), ...audit,
});
export const chronicCareProfilesTable = pgTable("chronic_care_profiles", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull(), condition: text("condition").notNull(), recordedDate: date("recorded_date", { mode: "string" }).notNull(), measurements: jsonb("measurements").notNull().default({}), medications: text("medications"), lastConsultationDate: date("last_consultation_date", { mode: "string" }), nextFollowUpDate: date("next_follow_up_date", { mode: "string" }), recordedByUserId: text("recorded_by_user_id").notNull(), ...audit,
});
export const investigationRequestsTable = pgTable("investigation_requests", {
  id: serial("id").primaryKey(), patientUserId: text("patient_user_id").notNull(), investigation: text("investigation").notNull(), requestingUserId: text("requesting_user_id").notNull(), facilityId: integer("facility_id"), referralId: integer("referral_id"), reportId: integer("report_id"), priority: text("priority").notNull().default("NORMAL"), status: text("status").notNull().default("REQUESTED"), requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(), scheduledAt: timestamp("scheduled_at", { withTimezone: true }), reviewedAt: timestamp("reviewed_at", { withTimezone: true }), ...audit,
});
export const facilityResourcesTable = pgTable("facility_resources", {
  id: serial("id").primaryKey(), facilityId: integer("facility_id").notNull(), resourceType: text("resource_type").notNull(), name: text("name").notNull(), status: text("status").notNull().default("AVAILABLE"), lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(), ...audit,
});
export const auditEventsTable = pgTable("audit_events", {
  id: serial("id").primaryKey(), actorUserId: text("actor_user_id").notNull(), actorRole: text("actor_role").notNull(), action: text("action").notNull(), patientUserId: text("patient_user_id"), entityType: text("entity_type").notNull(), entityId: text("entity_id"), metadata: jsonb("metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFacilitySchema = createInsertSchema(facilitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Facility = typeof facilitiesTable.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
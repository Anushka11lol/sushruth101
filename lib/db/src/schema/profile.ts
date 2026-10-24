import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  sushruthId: text("sushruth_id").unique(),
  phone: text("phone"),
  locationText: text("location_text"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

export const emergencyAccessTable = pgTable("emergency_access", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessCode: text("access_code").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmergencyAccessSchema = createInsertSchema(emergencyAccessTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmergencyAccess = z.infer<typeof insertEmergencyAccessSchema>;
export type EmergencyAccess = typeof emergencyAccessTable.$inferSelect;

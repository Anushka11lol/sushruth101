import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trackerEntriesTable = pgTable("tracker_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  hydration: numeric("hydration"),
  sleepHours: numeric("sleep_hours"),
  stressLevel: integer("stress_level"),
  activityMinutes: integer("activity_minutes"),
  symptoms: text("symptoms"),
  mood: text("mood"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrackerEntrySchema = createInsertSchema(trackerEntriesTable).omit({ id: true, createdAt: true });
export type InsertTrackerEntry = z.infer<typeof insertTrackerEntrySchema>;
export type TrackerEntry = typeof trackerEntriesTable.$inferSelect;

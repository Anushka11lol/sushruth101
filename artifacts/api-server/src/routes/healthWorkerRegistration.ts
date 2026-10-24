import { Router } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db, auditEventsTable, facilitiesTable, facilityMembershipsTable, healthWorkerProfilesTable,
  healthWorkerRegistrationsTable, facilityAssociationRequestsTable, healthWorkerRegistrationHistoryTable,
} from "@workspace/db";

const router = Router();
const userId = (req: any) => getAuth(req).userId as string;
const workerTypes = ["ASHA", "ANM", "COMMUNITY_HEALTH_WORKER", "OTHER"] as const;
const registration = z.object({
  fullName: z.string().trim().min(1).max(200), dateOfBirth: z.string().max(30).optional(),
  gender: z.string().max(40).optional(), phone: z.string().max(40).optional(), email: z.string().email().max(254).optional(),
  address: z.string().max(1000).optional(), photoPath: z.string().max(500).optional(),
  workerType: z.enum(workerTypes), workerId: z.string().max(100).optional(), training: z.string().max(1000).optional(),
  languages: z.array(z.string().max(80)).max(20).optional(), yearsExperience: z.number().int().min(0).max(100).optional(),
  facilityId: z.number().int().positive(), department: z.string().max(200).optional(), areaServed: z.string().max(500).optional(),
});
const update = registration.partial().omit({ facilityId: true }).extend({ facilityId: z.number().int().positive().optional() });
async function activeFacility(id: number) {
  const [f] = await db.select().from(facilitiesTable).where(and(eq(facilitiesTable.id, id), eq(facilitiesTable.active, "true")));
  return f;
}
async function history(actor: string, target: string, action: string, previousState: unknown, newState: unknown) {
  await db.insert(healthWorkerRegistrationHistoryTable).values({ actorUserId: actor, targetUserId: target, action, previousState: previousState as any, newState: newState as any });
}

router.get("/health-worker/registration/status", async (req, res) => {
  const [row] = await db.select().from(healthWorkerRegistrationsTable).where(eq(healthWorkerRegistrationsTable.userId, userId(req)));
  if (!row) { res.status(404).json({ error: "Worker registration not found" }); return; }
  const associations = await db.select().from(facilityAssociationRequestsTable).where(eq(facilityAssociationRequestsTable.userId, row.userId)).orderBy(desc(facilityAssociationRequestsTable.createdAt));
  res.json({ registration: row, associations });
});

router.post("/health-worker/registration", async (req, res) => {
  const parsed = registration.safeParse(req.body); if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const uid = userId(req); const data = parsed.data; if (!(await activeFacility(data.facilityId))) { res.status(400).json({ error: "Selected facility is unavailable" }); return; }
  const result = await db.transaction(async (tx) => {
    const [old] = await tx.select().from(healthWorkerRegistrationsTable).where(eq(healthWorkerRegistrationsTable.userId, uid));
    const [row] = old
      ? await tx.update(healthWorkerRegistrationsTable).set({ ...data, professionalStatus: old.professionalStatus === "VERIFIED" ? "UPDATE_REQUIRED" : "PENDING", rejectionReason: null, updatedAt: new Date() }).where(eq(healthWorkerRegistrationsTable.userId, uid)).returning()
      : await tx.insert(healthWorkerRegistrationsTable).values({ ...data, userId: uid, professionalStatus: "PENDING" }).returning();
    const [pending] = await tx.select().from(facilityAssociationRequestsTable).where(and(eq(facilityAssociationRequestsTable.userId, uid), eq(facilityAssociationRequestsTable.status, "PENDING")));
    if (pending && pending.facilityId === data.facilityId) return { row, association: pending };
    if (pending) await tx.update(facilityAssociationRequestsTable).set({ status: "REMOVED", updatedAt: new Date() }).where(eq(facilityAssociationRequestsTable.id, pending.id));
    const [association] = await tx.insert(facilityAssociationRequestsTable).values({ registrationId: row.id, userId: uid, facilityId: data.facilityId, status: "PENDING" }).returning();
    return { row, association };
  });
  await history(uid, uid, "REGISTRATION_SUBMITTED", null, result);
  await db.insert(auditEventsTable).values({ actorUserId: uid, actorRole: "frontline_worker", action: "REGISTRATION_SUBMITTED", entityType: "health_worker_registration", entityId: String(result.row.id), metadata: result });
  res.status(201).json(result);
});

router.patch("/health-worker/registration/profile", async (req, res) => {
  const parsed = update.safeParse(req.body); if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const uid = userId(req); const [old] = await db.select().from(healthWorkerRegistrationsTable).where(eq(healthWorkerRegistrationsTable.userId, uid));
  if (!old) { res.status(404).json({ error: "Worker registration not found" }); return; }
  const data = parsed.data; if (data.facilityId && !(await activeFacility(data.facilityId))) { res.status(400).json({ error: "Selected facility is unavailable" }); return; }
  // Presence alone is not a change: ordinary profile edits must not revoke an
  // already-approved worker. Treat omitted values as unchanged and compare
  // nullable stored values explicitly.
  const changed = (key: "workerType" | "workerId" | "training" | "facilityId", value: unknown) =>
    Object.prototype.hasOwnProperty.call(data, key) && value !== old[key];
  const facilityChanged = changed("facilityId", data.facilityId);
  const sensitive = changed("workerType", data.workerType) || changed("workerId", data.workerId) ||
    changed("training", data.training) || facilityChanged;
  const [row] = await db.update(healthWorkerRegistrationsTable).set({ ...data, professionalStatus: sensitive ? "UPDATE_REQUIRED" : old.professionalStatus, updatedAt: new Date() }).where(eq(healthWorkerRegistrationsTable.userId, uid)).returning();
  if (sensitive) {
    const targetFacilityId = data.facilityId ?? old.facilityId;
    if (facilityChanged) {
      await db.update(facilityAssociationRequestsTable).set({ status: "REMOVED", updatedAt: new Date() }).where(and(
        eq(facilityAssociationRequestsTable.userId, uid), eq(facilityAssociationRequestsTable.status, "PENDING"),
      ));
    }
    const [pending] = await db.select({ id: facilityAssociationRequestsTable.id }).from(facilityAssociationRequestsTable).where(and(
      eq(facilityAssociationRequestsTable.userId, uid), eq(facilityAssociationRequestsTable.facilityId, targetFacilityId),
      eq(facilityAssociationRequestsTable.status, "PENDING"),
    )).limit(1);
    if (!pending) await db.insert(facilityAssociationRequestsTable).values({ registrationId: row.id, userId: uid, facilityId: targetFacilityId, status: "PENDING" });
  }
  await history(uid, uid, "REGISTRATION_PROFILE_UPDATED", old, row);
  res.json(row);
});

router.get("/facilities/public", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const where = q ? and(eq(facilitiesTable.active, "true"), or(ilike(facilitiesTable.name, `%${q}%`), ilike(facilitiesTable.code, `%${q}%`), ilike(facilitiesTable.city, `%${q}%`))) : eq(facilitiesTable.active, "true");
  const rows = await db.select({ id: facilitiesTable.id, code: facilitiesTable.code, name: facilitiesTable.name, type: facilitiesTable.type, city: facilitiesTable.city, address: facilitiesTable.address }).from(facilitiesTable).where(where).limit(100);
  res.json(rows);
});

async function adminFacility(req: any) {
  const uid = userId(req); const [m] = await db.select().from(facilityMembershipsTable).where(and(eq(facilityMembershipsTable.userId, uid), eq(facilityMembershipsTable.role, "facility_admin"), eq(facilityMembershipsTable.active, "true"))); return m;
}
router.get("/facilities/staff-requests", async (req, res) => {
  const m = await adminFacility(req); if (!m) { res.status(403).json({ error: "Facility admin membership required" }); return; }
  const rows = await db.select({
    id: facilityAssociationRequestsTable.id, status: facilityAssociationRequestsTable.status,
    facilityId: facilityAssociationRequestsTable.facilityId, createdAt: facilityAssociationRequestsTable.createdAt,
    fullName: healthWorkerRegistrationsTable.fullName, workerType: healthWorkerRegistrationsTable.workerType,
    workerId: healthWorkerRegistrationsTable.workerId, training: healthWorkerRegistrationsTable.training,
    languages: healthWorkerRegistrationsTable.languages, yearsExperience: healthWorkerRegistrationsTable.yearsExperience,
    department: healthWorkerRegistrationsTable.department, areaServed: healthWorkerRegistrationsTable.areaServed,
    professionalStatus: healthWorkerRegistrationsTable.professionalStatus,
  }).from(facilityAssociationRequestsTable).innerJoin(healthWorkerRegistrationsTable, eq(healthWorkerRegistrationsTable.id, facilityAssociationRequestsTable.registrationId))
    .where(and(eq(facilityAssociationRequestsTable.facilityId, m.facilityId), eq(facilityAssociationRequestsTable.status, "PENDING")))
    .orderBy(desc(facilityAssociationRequestsTable.createdAt));
  res.json(rows);
});
router.post("/facilities/staff-requests/:id/approve", async (req, res) => {
  const m = await adminFacility(req); if (!m) { res.status(403).json({ error: "Facility admin membership required" }); return; }
  const id = Number(req.params.id); const result = await db.transaction(async (tx) => {
    const [request] = await tx.select().from(facilityAssociationRequestsTable).where(and(eq(facilityAssociationRequestsTable.id, id), eq(facilityAssociationRequestsTable.facilityId, m.facilityId)));
    if (!request || request.status !== "PENDING") return null;
    const [reg] = await tx.select().from(healthWorkerRegistrationsTable).where(eq(healthWorkerRegistrationsTable.userId, request.userId));
    if (!reg) return null;
    await tx.update(facilityAssociationRequestsTable).set({ status: "REMOVED", actedByUserId: userId(req), actedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(facilityAssociationRequestsTable.userId, request.userId), eq(facilityAssociationRequestsTable.status, "APPROVED")));
    await tx.update(facilityMembershipsTable).set({ active: "false", updatedAt: new Date() })
      .where(and(eq(facilityMembershipsTable.userId, request.userId), eq(facilityMembershipsTable.active, "true")));
    const [updated] = await tx.update(facilityAssociationRequestsTable).set({ status: "APPROVED", actedByUserId: userId(req), actedAt: new Date(), updatedAt: new Date() }).where(eq(facilityAssociationRequestsTable.id, id)).returning();
    await tx.update(healthWorkerRegistrationsTable).set({ professionalStatus: "VERIFIED", rejectionReason: null, updatedAt: new Date() }).where(eq(healthWorkerRegistrationsTable.id, reg.id));
    await tx.insert(facilityMembershipsTable).values({ facilityId: m.facilityId, userId: request.userId, role: reg.workerType === "ASHA" ? "asha" : reg.workerType === "ANM" ? "anm" : "frontline_worker", active: "true" }).onConflictDoUpdate({ target: [facilityMembershipsTable.facilityId, facilityMembershipsTable.userId], set: { active: "true", updatedAt: new Date() } });
    await tx.insert(healthWorkerProfilesTable).values({ userId: request.userId, facilityId: m.facilityId, workerType: reg.workerType, phone: reg.phone, active: "true" }).onConflictDoUpdate({ target: healthWorkerProfilesTable.userId, set: { facilityId: m.facilityId, workerType: reg.workerType, active: "true", updatedAt: new Date() } });
    return updated;
  });
  if (!result) { res.status(404).json({ error: "Pending staff request not found" }); return; }
  await history(userId(req), result.userId, "ASSOCIATION_APPROVED", { status: "PENDING" }, result);
  await db.insert(auditEventsTable).values({ actorUserId: userId(req), actorRole: "facility_admin", action: "ASSOCIATION_APPROVED", entityType: "facility_association_request", entityId: String(result.id), metadata: result });
  res.json(result);
});
router.post("/facilities/staff-requests/:id/reject", async (req, res) => {
  const m = await adminFacility(req); if (!m) { res.status(403).json({ error: "Facility admin membership required" }); return; }
  const reason = z.string().trim().min(1).max(1000).safeParse(req.body?.reason); if (!reason.success) { res.status(400).json({ error: "Rejection reason is required" }); return; }
  const [request] = await db.update(facilityAssociationRequestsTable).set({ status: "REJECTED", rejectionReason: reason.data, actedByUserId: userId(req), actedAt: new Date(), updatedAt: new Date() }).where(and(eq(facilityAssociationRequestsTable.id, Number(req.params.id)), eq(facilityAssociationRequestsTable.facilityId, m.facilityId), eq(facilityAssociationRequestsTable.status, "PENDING"))).returning();
  if (!request) { res.status(404).json({ error: "Pending staff request not found" }); return; }
  await db.update(healthWorkerRegistrationsTable).set({ professionalStatus: "REJECTED", rejectionReason: reason.data, updatedAt: new Date() }).where(eq(healthWorkerRegistrationsTable.userId, request.userId));
  await history(userId(req), request.userId, "ASSOCIATION_REJECTED", { status: "PENDING" }, request);
  await db.insert(auditEventsTable).values({ actorUserId: userId(req), actorRole: "facility_admin", action: "ASSOCIATION_REJECTED", entityType: "facility_association_request", entityId: String(request.id), metadata: { reason: reason.data } });
  res.json(request);
});
export default router;
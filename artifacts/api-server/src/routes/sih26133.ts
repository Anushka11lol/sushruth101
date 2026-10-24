import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  db, auditEventsTable, chronicCareProfilesTable, facilitiesTable, facilityInventoryTable,
  facilityMembershipsTable, facilityResourcesTable, followUpTasksTable, healthWorkerProfilesTable,
  investigationRequestsTable, maternalProfilesTable, referralStatusHistoryTable, referralsTable,
  registeredPatientsTable, vitalsTable, portalProfilesTable, userProfilesTable,
  healthWorkerRegistrationsTable, facilityAssociationRequestsTable,
} from "@workspace/db";
import {
  CreateChronicCareProfileBody, CreateFacilityBody, CreateFacilityResourceBody, CreateFollowUpBody,
  CreateInvestigationRequestBody, CreateReferralBody, GetHealthWorkerProfileResponse,
  UpsertFacilityInventoryBody, ListFacilityInventoryParams, ListFacilityResourcesParams,
  ListInvestigationRequestsQueryParams, ListReferralsQueryParams, ListFollowUpsQueryParams,
  RegisterHealthWorkerPatientBody, RecordFollowUpOutcomeBody, RecordFollowUpOutcomeParams,
  RecordHealthWorkerVitalsBody, SearchFacilityInventoryQueryParams,
  SearchHealthWorkerPatientsQueryParams, UpdateInvestigationStatusBody, UpdateInvestigationStatusParams,
  UpdateReferralStatusBody, UpdateReferralStatusParams, UpsertHealthWorkerProfileBody,
  UpsertMaternalProfileBody,
} from "@workspace/api-zod";

const router = Router();
const today = () => new Date().toISOString().slice(0, 10);
const authUser = (req: any) => getAuth(req).userId as string;
const bad = (res: any, error: unknown) => { res.status(400).json({ error: error instanceof Error ? error.message : String(error) }); };

async function profile(userId: string) {
  const [p] = await db.select().from(healthWorkerProfilesTable).where(and(eq(healthWorkerProfilesTable.userId, userId), eq(healthWorkerProfilesTable.active, "true")));
  if (p) return p;
  // A worker profile is a projection of an active worker membership.  Do not
  // use portalRole (or any other user profile) as an authority signal here.
  const [membership] = await db.select().from(facilityMembershipsTable).where(and(
    eq(facilityMembershipsTable.userId, userId),
    eq(facilityMembershipsTable.active, "true"),
    or(eq(facilityMembershipsTable.role, "frontline_worker"), eq(facilityMembershipsTable.role, "asha"), eq(facilityMembershipsTable.role, "anm")),
  ));
  if (!membership) return undefined;
  const workerType = membership.role === "asha" ? "ASHA" : membership.role === "anm" ? "ANM" : "PHC_WORKER";
  await db.insert(healthWorkerProfilesTable).values({
    userId, facilityId: membership.facilityId, workerType, active: "true",
  } as any).onConflictDoNothing();
  const [repaired] = await db.select().from(healthWorkerProfilesTable).where(and(eq(healthWorkerProfilesTable.userId, userId), eq(healthWorkerProfilesTable.active, "true")));
  return repaired;
}
async function permittedWorker(req: any, res: any) {
  const userId = authUser(req); const p = await profile(userId);
  if (!p) { res.status(403).json({ error: "Frontline worker role required" }); return null; }
  if (!p.facilityId) { res.status(403).json({ error: "Active facility membership required" }); return null; }
  const [membership] = await db.select().from(facilityMembershipsTable).where(and(eq(facilityMembershipsTable.userId, userId), eq(facilityMembershipsTable.facilityId, p.facilityId), eq(facilityMembershipsTable.active, "true"), or(eq(facilityMembershipsTable.role, "frontline_worker"), eq(facilityMembershipsTable.role, "asha"), eq(facilityMembershipsTable.role, "anm"))));
  if (!membership) { res.status(403).json({ error: "Active facility membership required" }); return null; }
  const [registration] = await db.select().from(healthWorkerRegistrationsTable).where(eq(healthWorkerRegistrationsTable.userId, userId));
  if (registration) {
    if (registration.professionalStatus !== "VERIFIED") { res.status(403).json({ error: "Professional verification required" }); return null; }
    const [association] = await db.select().from(facilityAssociationRequestsTable).where(and(
      eq(facilityAssociationRequestsTable.userId, userId), eq(facilityAssociationRequestsTable.facilityId, p.facilityId),
      eq(facilityAssociationRequestsTable.status, "APPROVED"),
    ));
    if (!association) { res.status(403).json({ error: "Approved facility association required" }); return null; }
  }
  return { userId, worker: p };
}
async function permittedAdmin(req: any, res: any) {
  const userId = authUser(req);
  const [membership] = await db.select().from(facilityMembershipsTable).where(and(eq(facilityMembershipsTable.userId, userId), eq(facilityMembershipsTable.active, "true")));
  if (membership && membership.role !== "facility_admin") { res.status(403).json({ error: "Facility admin membership required" }); return null; }
  if (!membership) {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(facilitiesTable);
    if (Number(count) > 0) { res.status(403).json({ error: "Active facility membership required" }); return null; }
    return { userId, membership: null, bootstrap: true };
  }
  return { userId, membership };
}
async function permittedFacilityActor(req: any, res: any) {
  const userId = authUser(req);
  const worker = await profile(userId);
  if (worker?.facilityId) {
    const [membership] = await db.select().from(facilityMembershipsTable).where(and(eq(facilityMembershipsTable.userId, userId), eq(facilityMembershipsTable.facilityId, worker.facilityId), eq(facilityMembershipsTable.active, "true")));
    if (membership) return { userId, facilityId: worker.facilityId, role: worker.workerType };
  }
  const admin = await permittedAdmin(req, res);
  if (admin?.membership) return { userId: admin.userId, facilityId: admin.membership.facilityId, role: "facility_admin" };
  return null;
}
async function patientInFacility(patientUserId: string, facilityId: number) {
  const [patient] = await db.select().from(registeredPatientsTable).where(and(eq(registeredPatientsTable.patientUserId, patientUserId), eq(registeredPatientsTable.facilityId, facilityId)));
  return Boolean(patient);
}
async function audit(actorUserId: string, actorRole: string, action: string, entityType: string, entityId: string, patientUserId?: string) {
  await db.insert(auditEventsTable).values({ actorUserId, actorRole, action, entityType, entityId, patientUserId, metadata: {} });
}
function stockStatus(quantity: number, minimumStock: number) { return quantity === 0 ? "OUT_OF_STOCK" : quantity <= minimumStock ? "LOW_STOCK" : "AVAILABLE"; }
const normalizePhone = (value?: string) => value ? value.replace(/\D/g, "") : undefined;
const normalizeSushruthId = (value?: string) => value ? value.trim().toUpperCase() : undefined;
const normalizeName = (value?: string) => value?.trim().replace(/\s+/g, " ").toLowerCase();
const clerkPhone = (user: any): string | undefined => {
  const primary = typeof user?.primaryPhoneNumber === "string" ? user.primaryPhoneNumber : user?.primaryPhoneNumber?.phoneNumber;
  return primary ?? user?.phoneNumbers?.[0]?.phoneNumber;
};
const referralTransitions: Record<string, string[]> = {
  CREATED: ["ACCEPTED", "CANCELLED", "REJECTED"],
  ACCEPTED: ["APPOINTMENT_SCHEDULED", "CANCELLED", "REJECTED"],
  APPOINTMENT_SCHEDULED: ["CONSULTED", "CANCELLED"],
  CONSULTED: ["INVESTIGATION_PENDING", "COMPLETED"],
  INVESTIGATION_PENDING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

router.get("/health-worker/profile", async (req, res): Promise<void> => {
  const p = await profile(authUser(req)); if (!p) { res.status(404).json({ error: "Health worker profile not found" }); return; }
  res.json(GetHealthWorkerProfileResponse.parse(p));
});
router.put("/health-worker/profile", async (req, res): Promise<void> => {
  const p = UpsertHealthWorkerProfileBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; }
  const userId = authUser(req);
  const [existing] = await db.select().from(healthWorkerProfilesTable).where(eq(healthWorkerProfilesTable.userId, userId));
  if (!p.data.facilityId) { res.status(403).json({ error: "Facility assignment requires matching active membership" }); return; }
  if (p.data.facilityId) {
    const role = p.data.workerType === "ASHA" ? "asha" : p.data.workerType === "ANM" ? "anm" : "frontline_worker";
    const [membership] = await db.select().from(facilityMembershipsTable).where(and(eq(facilityMembershipsTable.userId, userId), eq(facilityMembershipsTable.facilityId, p.data.facilityId), eq(facilityMembershipsTable.active, "true"), eq(facilityMembershipsTable.role, role)));
    if (!membership) { res.status(403).json({ error: "Matching active worker membership required" }); return; }
  }
  const [row] = await db.insert(healthWorkerProfilesTable).values({ ...p.data, userId }).onConflictDoUpdate({ target: healthWorkerProfilesTable.userId, set: { workerType: p.data.workerType, facilityId: p.data.facilityId, registrationNumber: p.data.registrationNumber, phone: p.data.phone, active: "true", updatedAt: new Date() } }).returning();
  await audit(userId, p.data.workerType, "PROFILE_UPDATED", "health_worker_profile", String(row.id));
  res.json(row);
});
router.get("/health-worker/patients", async (req, res): Promise<void> => {
  const p = SearchHealthWorkerPatientsQueryParams.safeParse(req.query); if (!p.success) { bad(res, p.error); return; }
  const access = await permittedWorker(req, res); if (!access) return;
  const q = p.data.q?.trim(); const where = q ? or(ilike(registeredPatientsTable.name, `%${q}%`), ilike(registeredPatientsTable.phone, `%${q}%`), ilike(registeredPatientsTable.sushruthId, `%${q}%`)) : undefined;
  const facilityWhere = eq(registeredPatientsTable.facilityId, access.worker.facilityId!);
  const registered = await db.select().from(registeredPatientsTable).where(where ? and(facilityWhere, where) : facilityWhere).orderBy(desc(registeredPatientsTable.createdAt)).limit(50);
  const registeredIds = new Set(registered.map((row) => row.patientUserId));
  const portalRows = registered.length
    ? await db.select({ userId: portalProfilesTable.userId }).from(portalProfilesTable).where(and(eq(portalProfilesTable.portalRole, "patient"), inArray(portalProfilesTable.userId, registered.map((row) => row.patientUserId))))
    : [];
  const linkedIds = new Set(portalRows.map((row) => row.userId));
  const safeRegistered = registered.map((row) => ({
    ...row,
    matchType: "registered" as const,
    linkedToPortal: linkedIds.has(row.patientUserId),
  }));
  const candidates = new Map<string, { patientUserId: string; name: string; phone?: string; sushruthId?: string; matchType: "portal_account"; registrationStatus: "NOT_REGISTERED" }>();
  if (q) {
    const normalizedQPhone = normalizePhone(q);
    const localMatches = await db.select({ userId: userProfilesTable.userId, phone: userProfilesTable.phone, sushruthId: userProfilesTable.sushruthId })
      .from(userProfilesTable)
      .innerJoin(portalProfilesTable, eq(portalProfilesTable.userId, userProfilesTable.userId))
      .where(and(eq(portalProfilesTable.portalRole, "patient"), or(
        ilike(userProfilesTable.sushruthId, `%${q}%`),
        normalizedQPhone ? sql`regexp_replace(${userProfilesTable.phone}, '\\D', '', 'g') = ${normalizedQPhone}` : sql`false`,
      ))).limit(50);
    let clerkUsers: any[] = [];
    try {
      const result = await clerkClient.users.getUserList({ query: q, limit: 50 });
      clerkUsers = Array.isArray(result) ? result : (result as any).data ?? [];
    } catch {
      // Clerk being unavailable must not prevent local registry/profile matches.
    }
    const normalizedQName = normalizeName(q);
    clerkUsers = clerkUsers.filter((user) => {
      const name = normalizeName([user.firstName, user.lastName].filter(Boolean).join(" "));
      const phone = normalizePhone(clerkPhone(user));
      return Boolean((name && normalizedQName && name.includes(normalizedQName)) || (phone && normalizedQPhone && phone === normalizedQPhone));
    });
    const clerkById = new Map<string, any>(clerkUsers.map((user) => [user.id, user]));
    const ids = [...new Set([...localMatches.map((row) => row.userId), ...clerkUsers.map((user) => user.id)])].filter((id) => !registeredIds.has(id));
    const registeredAnywhere = ids.length
      ? await db.select({ patientUserId: registeredPatientsTable.patientUserId }).from(registeredPatientsTable).where(inArray(registeredPatientsTable.patientUserId, ids))
      : [];
    const registeredAnywhereIds = new Set(registeredAnywhere.map((row) => row.patientUserId));
    const eligibleIds = ids.filter((id) => !registeredAnywhereIds.has(id));
    const profiles = eligibleIds.length
      ? await db.select({ userId: portalProfilesTable.userId }).from(portalProfilesTable).where(and(eq(portalProfilesTable.portalRole, "patient"), inArray(portalProfilesTable.userId, eligibleIds)))
      : [];
    for (const { userId } of profiles) {
      const local = localMatches.find((row) => row.userId === userId);
      const user = clerkById.get(userId);
      const name = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";
      if (!name && !local) continue;
      candidates.set(userId, {
        patientUserId: userId,
        name: name || "Portal patient",
        phone: local?.phone ?? clerkPhone(user),
        sushruthId: local?.sushruthId ?? undefined,
        matchType: "portal_account",
        registrationStatus: "NOT_REGISTERED",
      });
    }
  }
  res.json([...safeRegistered, ...candidates.values()]);
});
router.post("/health-worker/patients", async (req, res): Promise<void> => {
  const p = RegisterHealthWorkerPatientBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; }
  const access = await permittedWorker(req, res); if (!access) return;
  let accountName: string | undefined;
  let accountPhone: string | undefined;
  let accountSushruthId: string | undefined;
  if (p.data.patientUserId) {
    const [portal] = await db.select({ userId: portalProfilesTable.userId }).from(portalProfilesTable).where(and(eq(portalProfilesTable.userId, p.data.patientUserId), eq(portalProfilesTable.portalRole, "patient")));
    if (!portal) { res.status(400).json({ error: "Patient portal account required" }); return; }
    const [alreadyRegistered] = await db.select().from(registeredPatientsTable).where(eq(registeredPatientsTable.patientUserId, p.data.patientUserId));
    if (alreadyRegistered) {
      if (alreadyRegistered.facilityId === access.worker.facilityId) { res.status(200).json({ ...alreadyRegistered, alreadyExists: true, message: "Patient already exists — open existing record." }); return; }
      res.status(409).json({ error: "Patient is already registered" }); return;
    }
    const [localProfile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, p.data.patientUserId));
    accountSushruthId = localProfile?.sushruthId ?? undefined;
    try {
      const user: any = await clerkClient.users.getUser(p.data.patientUserId);
      accountName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || undefined;
      accountPhone = localProfile?.phone ?? clerkPhone(user);
    } catch {
      accountPhone = localProfile?.phone ?? undefined;
    }
    const submittedPhone = normalizePhone(p.data.phone);
    const submittedName = p.data.name.trim().replace(/\s+/g, " ").toLowerCase();
    const matchesName = Boolean(accountName && submittedName === accountName.replace(/\s+/g, " ").toLowerCase());
    const matchesPhone = Boolean(submittedPhone && accountPhone && submittedPhone === normalizePhone(accountPhone));
    if (!matchesName && !matchesPhone) { res.status(400).json({ error: "Submitted patient details do not match the portal account" }); return; }
  }
  const normalizedPhone = normalizePhone(p.data.phone) ?? (p.data.patientUserId ? normalizePhone(accountPhone) : undefined);
  const normalizedSushruthId = normalizeSushruthId(p.data.sushruthId) ?? normalizeSushruthId(accountSushruthId);
  const duplicate = await db.select().from(registeredPatientsTable).where(or(normalizedSushruthId ? sql`COALESCE(${registeredPatientsTable.normalizedSushruthId}, upper(trim(${registeredPatientsTable.sushruthId}))) = ${normalizedSushruthId}` : sql`false`, normalizedPhone ? sql`COALESCE(${registeredPatientsTable.normalizedPhone}, NULLIF(regexp_replace(${registeredPatientsTable.phone}, '\\D', '', 'g'), '')) = ${normalizedPhone}` : sql`false`)).limit(1);
  if (duplicate[0]) {
    // Do not disclose another facility's patient record (or its identifying fields).
    if (duplicate[0].facilityId !== access.worker.facilityId) { res.status(409).json({ error: "Patient is already registered" }); return; }
    res.status(200).json({ ...duplicate[0], alreadyExists: true, message: "Patient already exists — open existing record." }); return;
  }
  const patientUserId = p.data.patientUserId ?? `worker-patient-${crypto.randomUUID()}`;
  const canonicalSushruthId = normalizedSushruthId ?? `SUS-${Date.now()}`; const normalizedCanonicalSushruthId = normalizeSushruthId(canonicalSushruthId); const [row] = await db.insert(registeredPatientsTable).values({ patientUserId, name: accountName ?? p.data.name, dateOfBirth: p.data.dateOfBirth as any, age: p.data.age, sex: p.data.sex, phone: normalizedPhone ? normalizedPhone : p.data.phone, address: p.data.address, preferredLanguage: p.data.preferredLanguage, emergencyContact: p.data.emergencyContact, sushruthId: canonicalSushruthId, normalizedPhone, normalizedSushruthId: normalizedCanonicalSushruthId, registeredByUserId: access.userId, facilityId: access.worker.facilityId } as any).onConflictDoNothing().returning();
  if (!row) { const [existing] = await db.select().from(registeredPatientsTable).where(or(normalizedCanonicalSushruthId ? sql`COALESCE(${registeredPatientsTable.normalizedSushruthId}, upper(trim(${registeredPatientsTable.sushruthId}))) = ${normalizedCanonicalSushruthId}` : sql`false`, normalizedPhone ? sql`COALESCE(${registeredPatientsTable.normalizedPhone}, NULLIF(regexp_replace(${registeredPatientsTable.phone}, '\\D', '', 'g'), '')) = ${normalizedPhone}` : sql`false`, eq(registeredPatientsTable.sushruthId, canonicalSushruthId))).limit(1); if (existing && existing.facilityId === access.worker.facilityId) { res.status(200).json({ ...existing, alreadyExists: true, message: "Patient already exists — open existing record." }); return; } if (existing) { res.status(409).json({ error: "Patient is already registered" }); return; } res.status(409).json({ error: "Patient registration conflicted; retry with existing identity" }); return; }
  await audit(access.userId, access.worker.workerType, "PATIENT_REGISTERED", "registered_patient", String(row.id), patientUserId); res.status(201).json(row);
});
router.post("/health-worker/vitals", async (req, res): Promise<void> => {
  const p = RecordHealthWorkerVitalsBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; }
  const access = await permittedWorker(req, res); if (!access) return;
  if (!(await patientInFacility(p.data.patientUserId, access.worker.facilityId!))) { res.status(403).json({ error: "Patient is outside worker facility" }); return; }
  const [row] = await db.insert(vitalsTable).values({ patientUserId: p.data.patientUserId, values: p.data.values, recordedByUserId: access.userId, facilityId: access.worker.facilityId, source: p.data.source ?? "worker_recorded", recordedAt: p.data.recordedAt ? new Date(p.data.recordedAt) : new Date() }).returning();
  await audit(access.userId, access.worker.workerType, "VITAL_RECORDED", "vital", String(row.id), p.data.patientUserId); res.status(201).json(row);
});

router.get("/referrals", async (req, res): Promise<void> => {
  const p = ListReferralsQueryParams.safeParse(req.query); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return;
  const conditions = [p.data.status ? eq(referralsTable.status, p.data.status) : undefined, p.data.patientUserId ? eq(referralsTable.patientUserId, p.data.patientUserId) : undefined, access.worker.facilityId ? or(eq(referralsTable.referringFacilityId, access.worker.facilityId), eq(referralsTable.destinationFacilityId, access.worker.facilityId)) : eq(referralsTable.referringUserId, access.userId)].filter(Boolean) as any[];
  res.json(await db.select().from(referralsTable).where(and(...conditions)).orderBy(desc(referralsTable.createdAt)));
});
router.post("/referrals", async (req, res): Promise<void> => {
  const p = CreateReferralBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return;
  if (!(await patientInFacility(p.data.patientUserId, access.worker.facilityId!))) { res.status(403).json({ error: "Patient is outside worker facility" }); return; }
  if (p.data.destinationFacilityId) { const [destination] = await db.select().from(facilitiesTable).where(and(eq(facilitiesTable.id, p.data.destinationFacilityId), eq(facilitiesTable.active, "true"))); if (!destination) { res.status(400).json({ error: "Destination facility is unavailable" }); return; } }
  const [row] = await db.insert(referralsTable).values({ patientUserId: p.data.patientUserId, destinationFacilityId: p.data.destinationFacilityId, reason: p.data.reason, chiefComplaint: p.data.chiefComplaint, relevantHistory: p.data.relevantHistory, priority: p.data.priority, specialty: p.data.specialty, requiredInvestigation: p.data.requiredInvestigation, referralDate: p.data.referralDate as any, expectedDate: p.data.expectedDate as any, notes: p.data.notes, referringUserId: access.userId, referringFacilityId: access.worker.facilityId, referralNumber: `REF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}` } as any).returning();
  await db.insert(referralStatusHistoryTable).values({ referralId: row.id, previousStatus: null, newStatus: "CREATED", changedByUserId: access.userId }); await audit(access.userId, access.worker.workerType, "REFERRAL_CREATED", "referral", String(row.id), row.patientUserId); res.status(201).json(row);
});
router.patch("/referrals/:id/status", async (req, res): Promise<void> => {
  const id = UpdateReferralStatusParams.safeParse(req.params); const p = UpdateReferralStatusBody.safeParse(req.body); if (!id.success || !p.success) { bad(res, "Invalid referral status"); return; } const access = await permittedWorker(req, res); if (!access) return;
  const [old] = await db.select().from(referralsTable).where(and(eq(referralsTable.id, id.data.id), or(eq(referralsTable.referringFacilityId, access.worker.facilityId!), eq(referralsTable.destinationFacilityId, access.worker.facilityId!)))); if (!old) { res.status(404).json({ error: "Referral not found" }); return; }
  if (!(referralTransitions[old.status] ?? []).includes(p.data.status)) { res.status(400).json({ error: `Invalid referral transition from ${old.status} to ${p.data.status}` }); return; }
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.update(referralsTable).set({ status: p.data.status, updatedAt: new Date() }).where(and(eq(referralsTable.id, old.id), eq(referralsTable.status, old.status), or(eq(referralsTable.referringFacilityId, access.worker.facilityId!), eq(referralsTable.destinationFacilityId, access.worker.facilityId!)))).returning();
    if (!row) return null;
    await tx.insert(referralStatusHistoryTable).values({ referralId: row.id, previousStatus: old.status, newStatus: p.data.status, changedByUserId: access.userId, note: p.data.note });
    return row;
  });
  if (!result) { res.status(409).json({ error: "Referral status changed concurrently" }); return; }
  await audit(access.userId, access.worker.workerType, "REFERRAL_STATUS_CHANGED", "referral", String(result.id), result.patientUserId); res.json(result);
});

router.get("/follow-ups", async (req, res): Promise<void> => {
  const p = ListFollowUpsQueryParams.safeParse(req.query); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return;
  res.json(await db.select().from(followUpTasksTable).where(and(p.data.status ? eq(followUpTasksTable.status, p.data.status) : undefined, access.worker.facilityId ? eq(followUpTasksTable.facilityId, access.worker.facilityId) : eq(followUpTasksTable.assignedToUserId, access.userId))).orderBy(followUpTasksTable.dueDate));
});
router.post("/follow-ups", async (req, res): Promise<void> => {
  const p = CreateFollowUpBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return;
  if (!(await patientInFacility(p.data.patientUserId, access.worker.facilityId!))) { res.status(403).json({ error: "Patient is outside worker facility" }); return; }
  if (p.data.assignedToUserId) { const [assignee] = await db.select().from(facilityMembershipsTable).where(and(eq(facilityMembershipsTable.userId, p.data.assignedToUserId), eq(facilityMembershipsTable.facilityId, access.worker.facilityId!), eq(facilityMembershipsTable.active, "true"))); if (!assignee) { res.status(400).json({ error: "Assignee is not an active facility member" }); return; } }
  let relatedReferral: { id: number } | undefined;
  if (p.data.referralId) { [relatedReferral] = await db.select({ id: referralsTable.id }).from(referralsTable).where(and(eq(referralsTable.id, p.data.referralId), eq(referralsTable.patientUserId, p.data.patientUserId), or(eq(referralsTable.referringFacilityId, access.worker.facilityId!), eq(referralsTable.destinationFacilityId, access.worker.facilityId!)))); if (!relatedReferral) { res.status(400).json({ error: "Referral is outside authorized facility scope" }); return; } }
  const [row] = await db.insert(followUpTasksTable).values({ patientUserId: p.data.patientUserId, reason: p.data.reason, dueDate: p.data.dueDate as any, priority: p.data.priority, notes: p.data.notes, referralId: relatedReferral?.id, assignedToUserId: p.data.assignedToUserId ?? access.userId, facilityId: access.worker.facilityId } as any).returning(); await audit(access.userId, access.worker.workerType, "FOLLOW_UP_CREATED", "follow_up", String(row.id), row.patientUserId); res.status(201).json(row);
});
router.patch("/follow-ups/:id/outcome", async (req, res): Promise<void> => {
  const id = RecordFollowUpOutcomeParams.safeParse(req.params); const p = RecordFollowUpOutcomeBody.safeParse(req.body); if (!id.success || !p.success) { bad(res, "Invalid follow-up outcome"); return; } const access = await permittedWorker(req, res); if (!access) return;
  const [row] = await db.update(followUpTasksTable).set({ status: p.data.status, outcome: p.data.outcome, notes: p.data.notes, completedByUserId: p.data.status === "COMPLETED" ? access.userId : undefined, completedAt: p.data.status === "COMPLETED" ? new Date() : undefined, updatedAt: new Date() }).where(and(eq(followUpTasksTable.id, id.data.id), or(eq(followUpTasksTable.facilityId, access.worker.facilityId!), eq(followUpTasksTable.assignedToUserId, access.userId)))).returning(); if (!row) { res.status(404).json({ error: "Follow-up not found" }); return; } await audit(access.userId, access.worker.workerType, "FOLLOW_UP_OUTCOME_RECORDED", "follow_up", String(row.id), row.patientUserId); res.json(row);
});

router.get("/facilities", async (req, res): Promise<void> => { const access = await permittedWorker(req, res); if (!access) return; const resource = typeof req.query.resource === "string" ? req.query.resource : undefined; const rows = resource ? await db.select({ facility: facilitiesTable, resource: facilityResourcesTable }).from(facilityResourcesTable).innerJoin(facilitiesTable, eq(facilitiesTable.id, facilityResourcesTable.facilityId)).where(eq(facilityResourcesTable.name, resource)) : await db.select().from(facilitiesTable).where(eq(facilitiesTable.active, "true")); res.json(rows); });
const workerRole = (role: string) => role === "frontline_worker" || role === "asha" || role === "anm";
const workerType = (role: string) => role === "asha" ? "ASHA" : role === "anm" ? "ANM" : "PHC_WORKER";

router.post("/facilities/:id/memberships", async (req, res): Promise<void> => {
  const facilityId = Number(req.params.id);
  const access = await permittedAdmin(req, res);
  if (!access?.membership || access.membership.facilityId !== facilityId) { if (!res.headersSent) res.status(403).json({ error: "Facility admin membership required" }); return; }
  const role = req.body?.role; const userId = req.body?.userId;
  if (!userId || !["facility_admin", "frontline_worker", "asha", "anm"].includes(role)) { bad(res, "Invalid membership"); return; }
  const row = await db.transaction(async (tx) => {
    const [membership] = await tx.insert(facilityMembershipsTable).values({ facilityId, userId, role, active: "true" })
      .onConflictDoUpdate({ target: [facilityMembershipsTable.facilityId, facilityMembershipsTable.userId], set: { role, active: "true", updatedAt: new Date() } }).returning();
    if (workerRole(role)) {
      await tx.insert(healthWorkerProfilesTable).values({ userId, facilityId, workerType: workerType(role), active: "true" } as any)
        .onConflictDoUpdate({ target: healthWorkerProfilesTable.userId, set: { facilityId, workerType: workerType(role), active: "true", updatedAt: new Date() } });
    } else {
      const [other] = await tx.select().from(facilityMembershipsTable).where(and(
        eq(facilityMembershipsTable.userId, userId), eq(facilityMembershipsTable.active, "true"),
        or(eq(facilityMembershipsTable.role, "frontline_worker"), eq(facilityMembershipsTable.role, "asha"), eq(facilityMembershipsTable.role, "anm")),
      ));
      if (other) await tx.update(healthWorkerProfilesTable).set({ facilityId: other.facilityId, workerType: workerType(other.role), active: "true", updatedAt: new Date() }).where(eq(healthWorkerProfilesTable.userId, userId));
      else await tx.update(healthWorkerProfilesTable).set({ active: "false", updatedAt: new Date() }).where(eq(healthWorkerProfilesTable.userId, userId));
    }
    return membership;
  });
  await audit(access.userId, "facility_admin", "MEMBERSHIP_GRANTED", "facility_membership", String(row.id)); res.status(201).json(row);
});

router.patch("/facilities/:id/memberships/:userId", async (req, res): Promise<void> => {
  const facilityId = Number(req.params.id); const userId = req.params.userId;
  const access = await permittedAdmin(req, res);
  if (!access?.membership || access.membership.facilityId !== facilityId) { if (!res.headersSent) res.status(403).json({ error: "Facility admin membership required" }); return; }
  const active = req.body?.active === true; const role = req.body?.role;
  if (role && !["facility_admin", "frontline_worker", "asha", "anm"].includes(role)) { bad(res, "Invalid membership role"); return; }
  const row = await db.transaction(async (tx) => {
    const [membership] = await tx.update(facilityMembershipsTable).set({ ...(role ? { role } : {}), active: active ? "true" : "false", updatedAt: new Date() })
      .where(and(eq(facilityMembershipsTable.facilityId, facilityId), eq(facilityMembershipsTable.userId, userId))).returning();
    if (!membership) return undefined;
    const effectiveRole = membership.role;
    if (membership.active === "true" && workerRole(effectiveRole)) {
      await tx.insert(healthWorkerProfilesTable).values({ userId, facilityId, workerType: workerType(effectiveRole), active: "true" } as any)
        .onConflictDoUpdate({ target: healthWorkerProfilesTable.userId, set: { facilityId, workerType: workerType(effectiveRole), active: "true", updatedAt: new Date() } });
    } else if (membership.active !== "true" || !workerRole(effectiveRole)) {
      // If another active worker membership exists, keep the projection pointed
      // at that membership rather than disabling the user altogether.
      const [other] = await tx.select().from(facilityMembershipsTable).where(and(
        eq(facilityMembershipsTable.userId, userId), eq(facilityMembershipsTable.active, "true"),
        or(eq(facilityMembershipsTable.role, "frontline_worker"), eq(facilityMembershipsTable.role, "asha"), eq(facilityMembershipsTable.role, "anm")),
      ));
      if (other) await tx.update(healthWorkerProfilesTable).set({ facilityId: other.facilityId, workerType: workerType(other.role), active: "true", updatedAt: new Date() }).where(eq(healthWorkerProfilesTable.userId, userId));
      else await tx.update(healthWorkerProfilesTable).set({ active: "false", updatedAt: new Date() }).where(eq(healthWorkerProfilesTable.userId, userId));
    }
    return membership;
  });
  if (!row) { res.status(404).json({ error: "Membership not found" }); return; }
  await audit(access.userId, "facility_admin", "MEMBERSHIP_UPDATED", "facility_membership", String(row.id)); res.json(row);
});
 router.post("/facilities", async (req, res): Promise<void> => { const p = CreateFacilityBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; } const access = await permittedAdmin(req, res); if (!access) return; try { const row = await db.transaction(async (tx) => { await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('sih26133_facility_bootstrap'))`); const [{ count }] = await tx.select({ count: sql<number>`count(*)` }).from(facilitiesTable); if (Number(count) > 0 && !access.membership) throw new Error("Active facility admin membership required"); const [created] = await tx.insert(facilitiesTable).values(p.data as any).returning(); await tx.insert(facilityMembershipsTable).values({ facilityId: created.id, userId: access.userId, role: "facility_admin", active: "true" }); return created; }); await audit(access.userId, "facility_admin", "FACILITY_CREATED", "facility", String(row.id)); res.status(201).json(row); } catch (error) { bad(res, error); } });
router.get("/facilities/dashboard", async (req, res): Promise<void> => { const access = await permittedFacilityActor(req, res); if (!access) return; const f = access.facilityId; const [facility] = await db.select().from(facilitiesTable).where(eq(facilitiesTable.id, f)); if (!facility) { res.status(404).json({ error: "Facility not found" }); return; } const referralScope = or(eq(referralsTable.referringFacilityId, f), eq(referralsTable.destinationFacilityId, f)); const openReferral = and(referralScope, sql`${referralsTable.status} NOT IN ('COMPLETED','CANCELLED','REJECTED')`); const openFollowup = and(eq(followUpTasksTable.facilityId, f), sql`${followUpTasksTable.status} IN ('PENDING','IN_PROGRESS')`); const openInvestigation = and(eq(investigationRequestsTable.facilityId, f), sql`${investigationRequestsTable.status} NOT IN ('REVIEWED','CANCELLED')`); const [patients, consultations, referrals, highRisk, due, overdue, investigations, stock, referralQueue, followupQueue, investigationQueue] = await Promise.all([db.select({ count: sql<number>`count(*)` }).from(registeredPatientsTable).where(and(eq(registeredPatientsTable.facilityId, f), sql`${registeredPatientsTable.createdAt}::date = CURRENT_DATE`)), db.select({ count: sql<number>`count(*)` }).from(referralsTable).where(and(referralScope, sql`${referralsTable.status} IN ('CONSULTED','COMPLETED')`)), db.select({ count: sql<number>`count(*)` }).from(referralsTable).where(openReferral), db.select({ count: sql<number>`count(*)` }).from(followUpTasksTable).where(and(openFollowup, eq(followUpTasksTable.priority, "HIGH_PRIORITY"))), db.select({ count: sql<number>`count(*)` }).from(followUpTasksTable).where(and(openFollowup, sql`${followUpTasksTable.dueDate} = CURRENT_DATE`)), db.select({ count: sql<number>`count(*)` }).from(followUpTasksTable).where(and(openFollowup, sql`${followUpTasksTable.dueDate} < CURRENT_DATE`)), db.select({ count: sql<number>`count(*)` }).from(investigationRequestsTable).where(openInvestigation), db.select({ count: sql<number>`count(*)` }).from(facilityInventoryTable).where(and(eq(facilityInventoryTable.facilityId, f), sql`${facilityInventoryTable.quantity} <= ${facilityInventoryTable.minimumStock}`)), db.select().from(referralsTable).where(openReferral).orderBy(desc(referralsTable.createdAt)).limit(20), db.select().from(followUpTasksTable).where(openFollowup).orderBy(followUpTasksTable.dueDate).limit(20), db.select().from(investigationRequestsTable).where(openInvestigation).orderBy(desc(investigationRequestsTable.requestedAt)).limit(20)]); res.json({ facilityId: f, facilityName: facility.name, facilityActive: facility.active === "true", dataLabel: "LIVE DATA", patientsRegisteredToday: Number(patients[0]?.count ?? 0), consultationsCompleted: { available: true, count: Number(consultations[0]?.count ?? 0), source: "referrals with CONSULTED or COMPLETED status" }, pendingReferrals: Number(referrals[0]?.count ?? 0), highRiskFollowUps: Number(highRisk[0]?.count ?? 0), followUpsDueToday: Number(due[0]?.count ?? 0), overdueFollowUps: Number(overdue[0]?.count ?? 0), pendingInvestigations: Number(investigations[0]?.count ?? 0), medicineStockAlerts: Number(stock[0]?.count ?? 0), actionQueues: { referrals: referralQueue, followUps: followupQueue, investigations: investigationQueue } }); });

router.get("/facilities/:id/inventory", async (req, res): Promise<void> => { const p = ListFacilityInventoryParams.safeParse(req.params); if (!p.success) { bad(res, p.error); return; } const access = await permittedFacilityActor(req, res); if (!access) return; if (access.facilityId !== p.data.id) { res.status(403).json({ error: "Facility access required" }); return; } const rows = await db.select().from(facilityInventoryTable).where(eq(facilityInventoryTable.facilityId, p.data.id)); res.json(rows.map((r) => ({ ...r, stockStatus: stockStatus(r.quantity, r.minimumStock) }))); });
router.post("/facilities/:id/inventory", async (req, res): Promise<void> => { const path = ListFacilityInventoryParams.safeParse(req.params); const p = UpsertFacilityInventoryBody.safeParse(req.body); if (!path.success || !p.success) { bad(res, "Invalid inventory input"); return; } const access = await permittedFacilityActor(req, res); if (!access) return; if (access.facilityId !== path.data.id) { res.status(403).json({ error: "Facility access required" }); return; } const [row] = await db.insert(facilityInventoryTable).values({ ...p.data, facilityId: path.data.id, updatedByUserId: access.userId }).returning(); await audit(access.userId, access.role, "INVENTORY_UPDATED", "inventory", String(row.id)); res.status(201).json({ ...row, stockStatus: stockStatus(row.quantity, row.minimumStock) }); });
router.get("/inventory/search", async (req, res): Promise<void> => { const p = SearchFacilityInventoryQueryParams.safeParse(req.query); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return; const rows = await db.select({ item: facilityInventoryTable, facility: facilitiesTable }).from(facilityInventoryTable).innerJoin(facilitiesTable, eq(facilitiesTable.id, facilityInventoryTable.facilityId)).where(ilike(facilityInventoryTable.medicineName, `%${p.data.medicine}%`)); res.json(rows.map(({ item, facility }) => ({ ...item, facility, stockStatus: stockStatus(item.quantity, item.minimumStock), availabilityNote: "Last updated from facility inventory" }))); });

router.get("/maternal-profiles", async (req, res): Promise<void> => { const access = await permittedWorker(req, res); if (!access) return; const patients = db.select({ id: registeredPatientsTable.patientUserId }).from(registeredPatientsTable).where(eq(registeredPatientsTable.facilityId, access.worker.facilityId!)); res.json(await db.select().from(maternalProfilesTable).where(sql`${maternalProfilesTable.patientUserId} IN (${patients})`)); });
 router.post("/maternal-profiles", async (req, res): Promise<void> => { const p = UpsertMaternalProfileBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return; if (!(await patientInFacility(p.data.patientUserId, access.worker.facilityId!))) { res.status(403).json({ error: "Patient is outside worker facility" }); return; } const [row] = await db.insert(maternalProfilesTable).values({ ...p.data, recordedByUserId: access.userId } as any).onConflictDoUpdate({ target: maternalProfilesTable.patientUserId, set: { ...p.data, updatedAt: new Date() } as any }).returning(); await audit(access.userId, access.worker.workerType, "MATERNAL_PROFILE_UPDATED", "maternal_profile", String(row.id), row.patientUserId); res.status(201).json(row); });
router.get("/chronic-care", async (req, res): Promise<void> => { const access = await permittedWorker(req, res); if (!access) return; const patients = db.select({ id: registeredPatientsTable.patientUserId }).from(registeredPatientsTable).where(eq(registeredPatientsTable.facilityId, access.worker.facilityId!)); res.json(await db.select().from(chronicCareProfilesTable).where(sql`${chronicCareProfilesTable.patientUserId} IN (${patients})`)); });
  router.post("/chronic-care", async (req, res): Promise<void> => { const p = CreateChronicCareProfileBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return; if (!(await patientInFacility(p.data.patientUserId, access.worker.facilityId!))) { res.status(403).json({ error: "Patient is outside worker facility" }); return; } const [row] = await db.insert(chronicCareProfilesTable).values({ ...p.data, recordedByUserId: access.userId } as any).returning(); await audit(access.userId, access.worker.workerType, "CHRONIC_PROFILE_CREATED", "chronic_profile", String(row.id), row.patientUserId); res.status(201).json(row); });
router.get("/investigations", async (req, res): Promise<void> => { const p = ListInvestigationRequestsQueryParams.safeParse(req.query); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return; res.json(await db.select().from(investigationRequestsTable).where(and(p.data.status ? eq(investigationRequestsTable.status, p.data.status) : undefined, access.worker.facilityId ? eq(investigationRequestsTable.facilityId, access.worker.facilityId) : eq(investigationRequestsTable.requestingUserId, access.userId))).orderBy(desc(investigationRequestsTable.requestedAt))); });
router.post("/investigations", async (req, res): Promise<void> => { const p = CreateInvestigationRequestBody.safeParse(req.body); if (!p.success) { bad(res, p.error); return; } const access = await permittedWorker(req, res); if (!access) return; if (!(await patientInFacility(p.data.patientUserId, access.worker.facilityId!))) { res.status(403).json({ error: "Patient is outside worker facility" }); return; } let validatedReferralId: number | undefined; if (p.data.referralId) { const [referral] = await db.select({ id: referralsTable.id }).from(referralsTable).where(and(eq(referralsTable.id, p.data.referralId), eq(referralsTable.patientUserId, p.data.patientUserId), or(eq(referralsTable.referringFacilityId, access.worker.facilityId!), eq(referralsTable.destinationFacilityId, access.worker.facilityId!)))); if (!referral) { res.status(400).json({ error: "Referral is outside authorized facility scope" }); return; } validatedReferralId = referral.id; } const [row] = await db.insert(investigationRequestsTable).values({ patientUserId: p.data.patientUserId, investigation: p.data.investigation, priority: p.data.priority, referralId: validatedReferralId, requestingUserId: access.userId, facilityId: access.worker.facilityId }).returning(); await audit(access.userId, access.worker.workerType, "INVESTIGATION_CREATED", "investigation", String(row.id), row.patientUserId); res.status(201).json(row); });
router.patch("/investigations/:id/status", async (req, res): Promise<void> => { const id = UpdateInvestigationStatusParams.safeParse(req.params); const p = UpdateInvestigationStatusBody.safeParse(req.body); if (!id.success || !p.success) { bad(res, "Invalid investigation status"); return; } const access = await permittedWorker(req, res); if (!access) return; const [row] = await db.update(investigationRequestsTable).set({ status: p.data.status, reportId: p.data.reportId, reviewedAt: p.data.status === "REVIEWED" ? new Date() : undefined, updatedAt: new Date() }).where(and(eq(investigationRequestsTable.id, id.data.id), eq(investigationRequestsTable.facilityId, access.worker.facilityId!))).returning(); if (!row) { res.status(404).json({ error: "Investigation not found" }); return; } await audit(access.userId, access.worker.workerType, "INVESTIGATION_STATUS_CHANGED", "investigation", String(row.id), row.patientUserId); res.json(row); });
router.get("/facilities/:id/resources", async (req, res): Promise<void> => { const p = ListFacilityResourcesParams.safeParse(req.params); if (!p.success) { bad(res, p.error); return; } const access = await permittedFacilityActor(req, res); if (!access) return; if (access.facilityId !== p.data.id) { res.status(403).json({ error: "Facility access required" }); return; } res.json(await db.select().from(facilityResourcesTable).where(eq(facilityResourcesTable.facilityId, p.data.id))); });
router.post("/facilities/:id/resources", async (req, res): Promise<void> => { const path = ListFacilityResourcesParams.safeParse(req.params); const p = CreateFacilityResourceBody.safeParse(req.body); if (!path.success || !p.success) { bad(res, "Invalid resource input"); return; } const access = await permittedFacilityActor(req, res); if (!access) return; if (access.facilityId !== path.data.id) { res.status(403).json({ error: "Facility access required" }); return; } const [row] = await db.insert(facilityResourcesTable).values({ ...p.data, facilityId: path.data.id }).returning(); await audit(access.userId, access.role, "FACILITY_RESOURCE_UPDATED", "facility_resource", String(row.id)); res.status(201).json(row); });

export default router;
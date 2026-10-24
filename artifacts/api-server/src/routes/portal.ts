import { Router } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, portalProfilesTable, preConsultationSubmissionsTable } from "@workspace/db";
import {
  CreatePreConsultationBody, GetPortalProfileQueryParams, GetPortalProfileResponse, GetPreConsultationParams, GetPreConsultationQueryParams, GetPreConsultationResponse,
  ListDoctorPreConsultationsQueryParams, ListDoctorPreConsultationsResponse, ListPatientPreConsultationsQueryParams, ListPatientPreConsultationsResponse,
  ReviewPreConsultationBody, ReviewPreConsultationParams, ReviewPreConsultationResponse, UpsertPortalProfileBody, UpsertPortalProfileResponse,
} from "@workspace/api-zod";
const router = Router();
const doctor = async (userId: string) => {
  const [profile] = await db.select().from(portalProfilesTable).where(and(eq(portalProfilesTable.userId, userId), eq(portalProfilesTable.portalRole, "doctor")));
  return Boolean(profile);
};
router.get("/portal-profile", async (req, res): Promise<void> => {
  const p = GetPortalProfileQueryParams.safeParse(req.query); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [profile] = await db.select().from(portalProfilesTable).where(eq(portalProfilesTable.userId, p.data.userId)); if (!profile) { res.status(404).json({ error: "Portal profile not found" }); return; } res.json(GetPortalProfileResponse.parse(profile));
});
router.put("/portal-profile", async (req, res): Promise<void> => {
  const p = UpsertPortalProfileBody.safeParse(req.body); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const userId = getAuth(req).userId;
  if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }
  const [profile] = await db.insert(portalProfilesTable).values({ ...p.data, userId }).onConflictDoUpdate({ target: portalProfilesTable.userId, set: { portalRole: p.data.portalRole, updatedAt: new Date() } }).returning();
  res.json(UpsertPortalProfileResponse.parse(profile));
});
router.get("/pre-consultations", async (req, res): Promise<void> => {
  const p = ListPatientPreConsultationsQueryParams.safeParse(req.query); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  if (p.data.patientUserId !== p.data.callerUserId) { res.status(403).json({ error: "Caller must match patient" }); return; }
  res.json(ListPatientPreConsultationsResponse.parse(await db.select().from(preConsultationSubmissionsTable).where(eq(preConsultationSubmissionsTable.patientUserId, p.data.patientUserId))));
});
router.post("/pre-consultations", async (req, res): Promise<void> => {
  const p = CreatePreConsultationBody.safeParse(req.body); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  if (p.data.patientUserId !== p.data.callerUserId) { res.status(403).json({ error: "Caller must match patient" }); return; }
  const { callerUserId: _callerUserId, ...data } = p.data; const [submission] = await db.insert(preConsultationSubmissionsTable).values({ ...data, status: "pending", verificationStates: {} }).returning(); res.status(201).json(submission);
});
router.get("/doctor/pre-consultations", async (req, res): Promise<void> => {
  const p = ListDoctorPreConsultationsQueryParams.safeParse(req.query); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  if (!(await doctor(p.data.callerUserId))) { res.status(403).json({ error: "Doctor portal role required" }); return; }
  const conditions = p.data.status
    ? and(eq(preConsultationSubmissionsTable.doctorUserId, p.data.callerUserId), eq(preConsultationSubmissionsTable.status, p.data.status))
    : eq(preConsultationSubmissionsTable.doctorUserId, p.data.callerUserId);
  const rows = await db.select().from(preConsultationSubmissionsTable).where(conditions);
  res.json(ListDoctorPreConsultationsResponse.parse(rows));
});
router.get("/pre-consultations/:id", async (req, res): Promise<void> => {
  const id = GetPreConsultationParams.safeParse(req.params), p = GetPreConsultationQueryParams.safeParse(req.query); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [row] = await db.select().from(preConsultationSubmissionsTable).where(eq(preConsultationSubmissionsTable.id, id.data.id)); if (!row) { res.status(404).json({ error: "Submission not found" }); return; }
  if (row.patientUserId !== p.data.callerUserId && row.doctorUserId !== p.data.callerUserId) { res.status(403).json({ error: "Patient or assigned doctor access required" }); return; }
  res.json(GetPreConsultationResponse.parse(row));
});
router.patch("/pre-consultations/:id", async (req, res): Promise<void> => {
  const id = ReviewPreConsultationParams.safeParse(req.params), p = ReviewPreConsultationBody.safeParse(req.body); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!(await doctor(p.data.callerUserId))) { res.status(403).json({ error: "Doctor portal role required" }); return; }
  const [assigned] = await db.select().from(preConsultationSubmissionsTable).where(eq(preConsultationSubmissionsTable.id, id.data.id));
  if (!assigned || assigned.doctorUserId !== p.data.callerUserId) { res.status(403).json({ error: "Assigned doctor access required" }); return; }
  const { callerUserId: _callerUserId, ...data } = p.data; const [row] = await db.update(preConsultationSubmissionsTable).set({ ...data, doctorUserId: p.data.callerUserId, reviewedAt: data.status === "reviewed" ? new Date() : undefined }).where(eq(preConsultationSubmissionsTable.id, id.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Submission not found" }); return; } res.json(ReviewPreConsultationResponse.parse(row));
});
export default router;
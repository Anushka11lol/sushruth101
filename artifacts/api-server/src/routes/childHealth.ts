import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, careCircleMembersTable, childGuardiansTable, childProfilesTable, immunizationRecordsTable } from "@workspace/db";
import {
  CreateChildBody, CreateImmunizationBody, CreateImmunizationParams,
  DeleteImmunizationParams, DeleteImmunizationQueryParams, GrantChildGuardianBody, GrantChildGuardianParams,
  ListChildrenQueryParams, ListChildrenResponse, ListImmunizationsParams, ListImmunizationsQueryParams,
  ListImmunizationsResponse, UpdateImmunizationBody, UpdateImmunizationParams, UpdateImmunizationResponse,
  EnsureVaccinationScheduleBody, EnsureVaccinationScheduleParams, EnsureVaccinationScheduleResponse,
} from "@workspace/api-zod";

const router = Router();
const day = (value: Date | null | undefined) => value ? value.toISOString().slice(0, 10) : value;
const isUnder18 = (dob: string): boolean => {
  const birth = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--;
  return age < 18;
};
const guardian = async (childId: number, userId: string, manage = false) => {
  const [access] = await db.select().from(childGuardiansTable).where(and(eq(childGuardiansTable.childProfileId, childId), eq(childGuardiansTable.userId, userId), eq(childGuardiansTable.status, "active")));
  return Boolean(access && (!manage || access.accessLevel === "manage"));
};
const immunizationChild = async (id: number) => {
  const [record] = await db.select().from(immunizationRecordsTable).where(eq(immunizationRecordsTable.id, id));
  return record;
};

router.get("/children", async (req, res): Promise<void> => {
  const p = ListChildrenQueryParams.safeParse(req.query); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const accesses = await db.select().from(childGuardiansTable).where(and(eq(childGuardiansTable.userId, p.data.callerUserId), eq(childGuardiansTable.status, "active")));
  // Drizzle's simple predicate is supplemented to avoid exposing other families.
  const all = await Promise.all(accesses.map(async (a) => (await db.select().from(childProfilesTable).where(eq(childProfilesTable.id, a.childProfileId)))[0]));
  res.json(ListChildrenResponse.parse(all.filter(Boolean)));
});
router.post("/children", async (req, res): Promise<void> => {
  const p = CreateChildBody.safeParse(req.body); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const dateOfBirth = day(p.data.dateOfBirth)!;
  if (!isUnder18(dateOfBirth)) { res.status(400).json({ error: "Child date of birth must represent a person under 18" }); return; }
  const { secondParentUserId, ...child } = p.data;
  if (secondParentUserId && secondParentUserId !== child.createdByUserId) {
    const [linkedParent] = await db
      .select()
      .from(careCircleMembersTable)
      .where(and(
        eq(careCircleMembersTable.userId, child.createdByUserId),
        eq(careCircleMembersTable.linkedUserId, secondParentUserId),
      ));
    if (!linkedParent) {
      res.status(403).json({ error: "The second parent must be a linked member of the creator's Care Circle" });
      return;
    }
  }
  const [created] = await db.insert(childProfilesTable).values({ ...child, dateOfBirth }).returning();
  await db.insert(childGuardiansTable).values({ childProfileId: created.id, userId: child.createdByUserId, relationship: "Parent", accessLevel: "manage", status: "active" });
  if (secondParentUserId && secondParentUserId !== child.createdByUserId) await db.insert(childGuardiansTable).values({ childProfileId: created.id, userId: secondParentUserId, relationship: "Parent", accessLevel: "manage", status: "active" }).onConflictDoNothing();
  res.status(201).json(created);
});
router.post("/children/:id/guardians", async (req, res): Promise<void> => {
  const id = GrantChildGuardianParams.safeParse(req.params), p = GrantChildGuardianBody.safeParse(req.body); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!(await guardian(id.data.id, p.data.callerUserId, true))) { res.status(403).json({ error: "Manage guardian access required" }); return; }
  const [circle] = await db.select().from(careCircleMembersTable).where(and(eq(careCircleMembersTable.userId, p.data.callerUserId), eq(careCircleMembersTable.linkedUserId, p.data.linkedUserId)));
  if (!circle) { res.status(400).json({ error: "Parent must be a linked Care Circle member" }); return; }
  const [created] = await db.insert(childGuardiansTable).values({ childProfileId: id.data.id, userId: p.data.linkedUserId, relationship: p.data.relationship ?? "Parent", accessLevel: p.data.accessLevel ?? "manage", status: "active" }).onConflictDoNothing().returning();
  if (!created) { res.status(409).json({ error: "Guardian already has access" }); return; } res.status(201).json(created);
});
router.get("/children/:childId/immunizations", async (req, res): Promise<void> => {
  const id = ListImmunizationsParams.safeParse(req.params), p = ListImmunizationsQueryParams.safeParse(req.query); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!(await guardian(id.data.childId, p.data.callerUserId))) { res.status(403).json({ error: "Active guardian access required" }); return; }
  res.json(ListImmunizationsResponse.parse(await db.select().from(immunizationRecordsTable).where(eq(immunizationRecordsTable.childProfileId, id.data.childId))));
});
router.post("/children/:childId/immunizations", async (req, res): Promise<void> => {
  const id = CreateImmunizationParams.safeParse(req.params), p = CreateImmunizationBody.safeParse(req.body); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!(await guardian(id.data.childId, p.data.callerUserId, true))) { res.status(403).json({ error: "Manage guardian access required" }); return; }
  const { callerUserId: _callerUserId, dueDate, administeredDate, ...data } = p.data; const [record] = await db.insert(immunizationRecordsTable).values({ ...data, dueDate: day(dueDate), administeredDate: day(administeredDate), childProfileId: id.data.childId }).returning(); res.status(201).json(record);
});
router.post("/children/:childId/immunizations/schedule", async (req, res): Promise<void> => {
  const id = EnsureVaccinationScheduleParams.safeParse(req.params);
  const p = EnsureVaccinationScheduleBody.safeParse(req.body);
  if (!id.success || !p.success) { res.status(400).json({ error: "Invalid vaccination schedule request" }); return; }
  if (!(await guardian(id.data.childId, p.data.callerUserId, true))) { res.status(403).json({ error: "Manage guardian access required" }); return; }

  const existing = await db.select().from(immunizationRecordsTable).where(eq(immunizationRecordsTable.childProfileId, id.data.childId));
  for (const item of p.data.records) {
    const alreadyExists = existing.some(record =>
      record.scheduleType === p.data.scheduleType &&
      record.vaccineName === item.vaccineName &&
      record.doseLabel === item.doseLabel &&
      record.recommendedAge === item.recommendedAge
    );
    if (!alreadyExists) {
      await db.insert(immunizationRecordsTable).values({
        childProfileId: id.data.childId,
        vaccineName: item.vaccineName,
        doseLabel: item.doseLabel,
        dueDate: day(item.scheduledDate),
        status: "upcoming",
        scheduleType: p.data.scheduleType,
        recommendedAge: item.recommendedAge,
        recommendedWindow: item.recommendedWindow,
        purpose: item.purpose,
        reminder7Days: true,
        reminder3Days: true,
        reminder1Day: true,
      });
    }
  }
  const scheduleRecords = await db.select().from(immunizationRecordsTable).where(eq(immunizationRecordsTable.childProfileId, id.data.childId));
  res.json(EnsureVaccinationScheduleResponse.parse(scheduleRecords.filter(record => record.scheduleType === p.data.scheduleType)));
});
router.patch("/immunizations/:id", async (req, res): Promise<void> => {
  const id = UpdateImmunizationParams.safeParse(req.params), p = UpdateImmunizationBody.safeParse(req.body); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const existing = await immunizationChild(id.data.id); if (!existing) { res.status(404).json({ error: "Immunization not found" }); return; }
  if (!(await guardian(existing.childProfileId, p.data.callerUserId, true))) { res.status(403).json({ error: "Manage guardian access required" }); return; }
  const { callerUserId: _callerUserId, dueDate, administeredDate, ...data } = p.data;
  const [record] = await db.update(immunizationRecordsTable).set({
    ...data,
    ...(dueDate !== undefined ? { dueDate: day(dueDate) } : {}),
    ...(administeredDate !== undefined ? { administeredDate: day(administeredDate) } : {}),
    ...(data.status && data.status !== "completed" ? { administeredDate: null } : {}),
    ...(data.status && (data.status as string) !== "not_applicable" ? { notApplicableReason: null } : {}),
  }).where(eq(immunizationRecordsTable.id, id.data.id)).returning();
  res.json(UpdateImmunizationResponse.parse(record));
});
router.delete("/immunizations/:id", async (req, res): Promise<void> => {
  const id = DeleteImmunizationParams.safeParse(req.params), p = DeleteImmunizationQueryParams.safeParse(req.query); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const existing = await immunizationChild(id.data.id); if (!existing) { res.status(404).json({ error: "Immunization not found" }); return; }
  if (!(await guardian(existing.childProfileId, p.data.callerUserId, true))) { res.status(403).json({ error: "Manage guardian access required" }); return; }
  await db.delete(immunizationRecordsTable).where(eq(immunizationRecordsTable.id, id.data.id)); res.status(204).send();
});
export default router;
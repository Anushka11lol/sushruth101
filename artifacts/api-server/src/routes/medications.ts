import { Router } from "express";
import { db } from "@workspace/db";
import { medicationsTable, medicationLogsTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  ListMedicationsQueryParams,
  CreateMedicationBody,
  UpdateMedicationParams,
  UpdateMedicationBody,
  DeleteMedicationParams,
  MarkMedicationTakenParams,
  MarkMedicationTakenBody,
  ListMedicationLogsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/medications", async (req, res) => {
  const parsed = ListMedicationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const meds = await db
    .select()
    .from(medicationsTable)
    .where(eq(medicationsTable.userId, parsed.data.userId))
    .orderBy(desc(medicationsTable.createdAt));
  res.json(meds);
});

router.post("/medications", async (req, res) => {
  const parsed = CreateMedicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [med] = await db.insert(medicationsTable).values(parsed.data).returning();
  res.status(201).json(med);
});

router.patch("/medications/:id", async (req, res) => {
  const paramsParsed = UpdateMedicationParams.safeParse(req.params);
  const bodyParsed = UpdateMedicationBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.dosage !== undefined) updates.dosage = bodyParsed.data.dosage;
  if (bodyParsed.data.frequency !== undefined) updates.frequency = bodyParsed.data.frequency;
  if (bodyParsed.data.timings !== undefined) updates.timings = bodyParsed.data.timings;
  if (bodyParsed.data.endDate !== undefined) updates.endDate = bodyParsed.data.endDate;
  if (bodyParsed.data.notes !== undefined) updates.notes = bodyParsed.data.notes;

  const [med] = await db
    .update(medicationsTable)
    .set(updates)
    .where(eq(medicationsTable.id, paramsParsed.data.id))
    .returning();
  if (!med) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(med);
});

router.delete("/medications/:id", async (req, res) => {
  const parsed = DeleteMedicationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db.delete(medicationsTable).where(eq(medicationsTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/medications/:id/taken", async (req, res) => {
  const paramsParsed = MarkMedicationTakenParams.safeParse(req.params);
  const bodyParsed = MarkMedicationTakenBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [med] = await db
    .select()
    .from(medicationsTable)
    .where(eq(medicationsTable.id, paramsParsed.data.id));
  if (!med) {
    res.status(404).json({ error: "Medication not found" });
    return;
  }

  const [log] = await db
    .insert(medicationLogsTable)
    .values({
      medicationId: paramsParsed.data.id,
      userId: med.userId,
      takenAt: new Date(bodyParsed.data.takenAt),
      notes: bodyParsed.data.notes ?? null,
    })
    .returning();

  res.json(log);
});

router.get("/medications/logs", async (req, res) => {
  const parsed = ListMedicationLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const days = parsed.data.days ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const logs = await db
    .select()
    .from(medicationLogsTable)
    .where(
      and(
        eq(medicationLogsTable.userId, parsed.data.userId),
        gte(medicationLogsTable.takenAt, cutoff),
      ),
    )
    .orderBy(desc(medicationLogsTable.takenAt));

  res.json(logs);
});

export default router;

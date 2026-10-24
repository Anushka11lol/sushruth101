import { Router } from "express";
import { db, prescriptionsTable, prescriptionMedicationItemsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ListPrescriptionsQueryParams, CreatePrescriptionBody, ExtractPrescriptionBody, GetPrescriptionParams, UpdatePrescriptionBody, UpdatePrescriptionParams, DeletePrescriptionParams } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getAuth } from "@clerk/express";

const router = Router();
const withItems = async (row: typeof prescriptionsTable.$inferSelect) => ({ ...row, warnings: JSON.parse(row.warnings), medicationItems: await db.select().from(prescriptionMedicationItemsTable).where(eq(prescriptionMedicationItemsTable.prescriptionId, row.id)) });

router.get("/prescriptions", async (req, res): Promise<void> => {
  const p = ListPrescriptionsQueryParams.safeParse(req.query); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const rows = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.userId, p.data.userId)).orderBy(desc(prescriptionsTable.createdAt));
  res.json(await Promise.all(rows.map(withItems)));
});
router.post("/prescriptions", async (req, res): Promise<void> => {
  const p = CreatePrescriptionBody.safeParse(req.body); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const { medicationItems, warnings = [], ...data } = p.data;
  const [row] = await db.insert(prescriptionsTable).values({ ...data, warnings: JSON.stringify(warnings) }).returning();
  if (medicationItems.length) await db.insert(prescriptionMedicationItemsTable).values(medicationItems.map((item) => ({ ...item, prescriptionId: row.id })));
  res.status(201).json(await withItems(row));
});
router.get("/prescriptions/:id", async (req, res): Promise<void> => {
  const p = GetPrescriptionParams.safeParse(req.params); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [row] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, p.data.id)); if (!row) { res.status(404).json({ error: "Prescription not found" }); return; } if (row.userId !== getAuth(req).userId) { res.status(403).json({ error: "Owner access required" }); return; } res.json(await withItems(row));
});
router.patch("/prescriptions/:id", async (req, res): Promise<void> => {
  const id = UpdatePrescriptionParams.safeParse(req.params), p = UpdatePrescriptionBody.safeParse(req.body); if (!id.success || !p.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [existing] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, id.data.id)); if (!existing) { res.status(404).json({ error: "Prescription not found" }); return; } if (existing.userId !== getAuth(req).userId) { res.status(403).json({ error: "Owner access required" }); return; }
  const { medicationItems, warnings, ...data } = p.data; const [row] = await db.update(prescriptionsTable).set({ ...data, ...(warnings ? { warnings: JSON.stringify(warnings) } : {}) }).where(eq(prescriptionsTable.id, id.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Prescription not found" }); return; }
  if (medicationItems) { await db.delete(prescriptionMedicationItemsTable).where(eq(prescriptionMedicationItemsTable.prescriptionId, row.id)); if (medicationItems.length) await db.insert(prescriptionMedicationItemsTable).values(medicationItems.map((item) => ({ ...item, prescriptionId: row.id }))); }
  res.json(await withItems(row));
});
router.delete("/prescriptions/:id", async (req, res): Promise<void> => {
  const p = DeletePrescriptionParams.safeParse(req.params); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  const [existing] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, p.data.id)); if (!existing) { res.status(404).json({ error: "Prescription not found" }); return; } if (existing.userId !== getAuth(req).userId) { res.status(403).json({ error: "Owner access required" }); return; }
  await db.delete(prescriptionMedicationItemsTable).where(eq(prescriptionMedicationItemsTable.prescriptionId, p.data.id)); const [row] = await db.delete(prescriptionsTable).where(eq(prescriptionsTable.id, p.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Prescription not found" }); return; } res.status(204).send();
});
router.post("/prescriptions/extract", async (req, res): Promise<void> => {
  const p = ExtractPrescriptionBody.safeParse(req.body); if (!p.success) { res.status(400).json({ error: p.error.message }); return; }
  try {
    const language = String((req.body as Record<string, unknown>).language ?? "English");
    const response = await anthropic.messages.create({ model: "claude-opus-4-6", max_tokens: 4096, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: p.data.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: p.data.imageBase64 } }, { type: "text", text: `Extract this printed or handwritten Indian prescription. Return ONLY JSON with prescriberName, prescriptionDate, extractedText, summary, isHandwritten, overallConfidence (0-100), warnings (array), medicationItems (medicationName, strength, dosage, frequency, duration, instructions, confidence). Preserve names, doses, dates and extractedText exactly as written. Write summary, warnings and instructions in ${language}. Never invent unreadable text: use "unclear" and add a review warning. This is review-only; do not activate medicines.` }] }] });
    const raw = response.content[0]?.type === "text" ? response.content[0].text : "{}"; const data = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    res.json({ prescriberName: data.prescriberName ?? null, prescriptionDate: data.prescriptionDate ?? null, extractedText: data.extractedText ?? "", summary: data.summary ?? "", isHandwritten: Boolean(data.isHandwritten), overallConfidence: Number(data.overallConfidence) || 0, warnings: Array.isArray(data.warnings) ? data.warnings : ["Patient or clinician review is required before saving."], medicationItems: Array.isArray(data.medicationItems) ? data.medicationItems : [] });
  } catch (err) { req.log.error({ err }, "Prescription extraction failed"); res.status(500).json({ error: "Failed to extract prescription" }); }
});
export default router;
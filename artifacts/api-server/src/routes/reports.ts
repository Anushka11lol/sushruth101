import { Router } from "express";
import { db } from "@workspace/db";
import { medicalReportsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListReportsQueryParams,
  CreateReportBody,
  GetReportParams,
  DeleteReportParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getAuth } from "@clerk/express";

const router = Router();

router.get("/reports", async (req, res) => {
  const parsed = ListReportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const reports = await db
    .select()
    .from(medicalReportsTable)
    .where(eq(medicalReportsTable.userId, parsed.data.userId))
    .orderBy(desc(medicalReportsTable.createdAt));
  res.json(reports);
});

router.post("/reports", async (req, res) => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { userId, reportType, title, rawText } = parsed.data;
  const language = String((req.body as Record<string, unknown>).language ?? "English");

  let simplifiedText: string | null = null;
  let abnormalValues: string | null = null;
  let specialistSuggestion: string | null = null;

  if (rawText) {
    try {
      const prompt = `You are Sushruth, an AI medical report simplifier. You MUST NOT diagnose diseases.

Analyze the following medical report text and respond with ONLY valid JSON:
{
  "simplifiedText": "<Explain the report in simple language a patient can understand. Use plain terms. Do NOT diagnose.>",
  "abnormalValues": "<List any values outside normal ranges, e.g. 'Hemoglobin: 9.5 g/dL (Normal: 12-16 g/dL) - LOW'. If none, say 'All values within normal range.'>",
  "specialistSuggestion": "<Suggest which type of specialist might be relevant based on this report type and values>"
}

Report Type: ${reportType}
Report Title: ${title}
Write simplifiedText, abnormalValues, and specialistSuggestion in ${language}. Preserve raw medical names, numbers, and units exactly.

Report Content:
${rawText}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const parsed_ai = JSON.parse(raw);
      simplifiedText = parsed_ai.simplifiedText ?? null;
      abnormalValues = parsed_ai.abnormalValues ?? null;
      specialistSuggestion = parsed_ai.specialistSuggestion ?? null;
    } catch (err) {
      req.log.error({ err }, "AI report analysis failed");
    }
  }

  const [report] = await db
    .insert(medicalReportsTable)
    .values({
      userId,
      reportType,
      title,
      rawText: rawText ?? null,
      simplifiedText,
      abnormalValues,
      specialistSuggestion,
      linkedTriageId: (parsed.data as any).linkedTriageId ?? null,
    })
    .returning();

  res.status(201).json(report);
});

router.post("/reports/extract-image", async (req, res) => {
  const { imageBase64, mimeType, language } = req.body as { imageBase64?: string; mimeType?: string; language?: string };
  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: "imageBase64 and mimeType are required" });
    return;
  }
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `You are a medical document reader for Indian patients. Extract ALL text content from this medical report or prescription image.
Output the extracted text exactly as it appears, preserving:
- Medication names, dosages, and frequencies
- Lab values with their units and reference ranges
- Doctor names, dates, hospital names
- All numbers, measurements, and abbreviations

Do NOT interpret or diagnose — just extract the raw text faithfully.
If you cannot read part of the image clearly, extract what you can and mark unclear sections with [unclear].`,
            },
          ],
        },
      ],
    });
    const block = response.content[0];
    const extractedText = block.type === "text" ? block.text : "";
    res.json({ extractedText });
  } catch (err) {
    req.log.error({ err }, "Image text extraction failed");
    res.status(500).json({ error: "Failed to extract text from image" });
  }
});

router.get("/reports/:id", async (req, res) => {
  const parsed = GetReportParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [report] = await db
    .select()
    .from(medicalReportsTable)
    .where(eq(medicalReportsTable.id, parsed.data.id));
  if (!report) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (report.userId !== getAuth(req).userId) { res.status(403).json({ error: "Owner access required" }); return; }
  res.json(report);
});

router.delete("/reports/:id", async (req, res) => {
  const parsed = DeleteReportParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [report] = await db.select().from(medicalReportsTable).where(eq(medicalReportsTable.id, parsed.data.id));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  if (report.userId !== getAuth(req).userId) { res.status(403).json({ error: "Owner access required" }); return; }
  await db.delete(medicalReportsTable).where(eq(medicalReportsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;

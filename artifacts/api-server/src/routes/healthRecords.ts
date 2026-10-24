import { Router } from "express";
import { db } from "@workspace/db";
import { healthRecordsTable, surgeriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetHealthRecordQueryParams,
  CreateHealthRecordBody,
  UpdateHealthRecordBody,
  ListSurgeriesQueryParams,
  CreateSurgeryBody,
  DeleteSurgeryParams,
  AnalyzeHealthPatternsBody,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/health-records", async (req, res) => {
  const parsed = GetHealthRecordQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const [record] = await db
    .select()
    .from(healthRecordsTable)
    .where(eq(healthRecordsTable.userId, parsed.data.userId));
  res.json(record ?? null);
});

router.post("/health-records", async (req, res) => {
  const parsed = CreateHealthRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const values = {
    ...parsed.data,
    height: parsed.data.height != null ? String(parsed.data.height) : null,
    weight: parsed.data.weight != null ? String(parsed.data.weight) : null,
  };
  const [record] = await db
    .insert(healthRecordsTable)
    .values(values)
    .onConflictDoUpdate({
      target: healthRecordsTable.userId,
      set: {
        bloodGroup: values.bloodGroup ?? null,
        allergies: values.allergies ?? null,
        chronicConditions: values.chronicConditions ?? null,
        currentMedications: values.currentMedications ?? null,
        emergencyContact: values.emergencyContact ?? null,
        height: values.height,
        weight: values.weight,
        updatedAt: new Date(),
      },
    })
    .returning();
  res.status(201).json(record);
});

router.patch("/health-records", async (req, res) => {
  const parsed = UpdateHealthRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const userId = (req.query.userId as string) || (req.body.userId as string);
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.bloodGroup !== undefined) updates.bloodGroup = parsed.data.bloodGroup;
  if (parsed.data.allergies !== undefined) updates.allergies = parsed.data.allergies;
  if (parsed.data.chronicConditions !== undefined) updates.chronicConditions = parsed.data.chronicConditions;
  if (parsed.data.currentMedications !== undefined) updates.currentMedications = parsed.data.currentMedications;
  if (parsed.data.emergencyContact !== undefined) updates.emergencyContact = parsed.data.emergencyContact;
  if (parsed.data.height !== undefined) updates.height = parsed.data.height !== null ? String(parsed.data.height) : null;
  if (parsed.data.weight !== undefined) updates.weight = parsed.data.weight !== null ? String(parsed.data.weight) : null;
  updates.updatedAt = new Date();

  const [record] = await db
    .update(healthRecordsTable)
    .set(updates)
    .where(eq(healthRecordsTable.userId, userId))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(record);
});

router.post("/health-records/analyze-document", async (req, res) => {
  const { imageBase64, mimeType, language = "English" } = req.body as { imageBase64?: string; mimeType?: string; language?: string };
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
              text: `You are a medical document analyzer for Indian patients. Carefully read this prescription or medical document image and extract all information. Preserve extracted text, names, medicine names, dosages, dates, values, and units exactly as written. Write the summary, warnings, and suggested explanatory fields in ${language}.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "extractedText": "<all text visible in the document, preserving medication names, dosages, lab values, dates>",
  "documentType": "<one of: Prescription | Lab Report | Discharge Summary | X-Ray Report | ECG Report | Other>",
  "summary": "<2-3 sentence plain-language summary understandable by a non-medical patient>",
  "suggestedMedications": "<comma-separated list of medication names and dosages found, or empty string>",
  "suggestedConditions": "<comma-separated list of diagnoses or medical conditions mentioned, or empty string>",
  "suggestedAllergies": "<comma-separated list of allergies documented, or empty string>"
}

Rules:
- Extract only what is explicitly written — do NOT infer or diagnose
- Include brand names AND generic names if both appear
- For lab reports, include key values and whether they are normal/abnormal`,
            },
          ],
        },
      ],
    });
    const block = response.content[0];
    const raw = block.type === "text" ? block.text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json({
      extractedText: data.extractedText ?? "",
      documentType: data.documentType ?? "Document",
      summary: data.summary ?? "",
      suggestedMedications: data.suggestedMedications ?? "",
      suggestedConditions: data.suggestedConditions ?? "",
      suggestedAllergies: data.suggestedAllergies ?? "",
    });
  } catch (err) {
    req.log.error({ err }, "Document analysis failed");
    res.status(500).json({ error: "Failed to analyze document" });
  }
});

router.post("/health-records/analyze-questionnaire", async (req, res) => {
  const { answers, firstName, language = "English" } = req.body as {
    answers?: Record<string, string | string[]>;
    firstName?: string;
    language?: string;
  };
  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "answers required" });
    return;
  }

  const LABELS: Record<string, string> = {
    age: "Age group",
    conditions: "Known health conditions",
    feeling: "How they are feeling today",
    sleep: "Hours slept last night",
    stress: "Stress level lately",
    energy: "Energy level today",
    eating: "Eating habits today",
    exercise: "Exercise frequency",
    mental: "Factors affecting mental wellbeing",
    goal: "Main health goal",
  };

  const answersText = Object.entries(answers)
    .map(([key, val]) => {
      const label = LABELS[key] ?? key;
      const value = Array.isArray(val) ? val.join(", ") : val;
      return `- ${label}: ${value}`;
    })
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Sushruth, a warm and friendly AI wellness companion for Indian users. You provide personalized daily health guidance based on a short wellness check-in. You never diagnose. You only encourage, motivate, and give practical guidance. Write every patient-facing JSON string in ${language}; keep JSON property names in English.`,
        },
        {
          role: "user",
          content: `Here are ${firstName ? firstName + "'s" : "a user's"} wellness check-in responses for today:\n\n${answersText}\n\nProvide a personalized daily health snapshot. Respond ONLY with valid JSON in this exact format:\n{\n  "summary": "<2-3 warm, friendly sentences summarizing their overall health snapshot for today based on their specific answers>",\n  "tips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>", "<actionable tip 4>"],\n  "highlights": {\n    "sleep": "<short phrase e.g. '6-8 hours - great!' or 'Under 4 hours - rest needed'>",\n    "stress": "<short phrase describing stress level>",\n    "energy": "<short phrase describing energy>",\n    "goal": "<restate their goal clearly and encouragingly>"\n  },\n  "overallScore": <integer 1-10>,\n  "overallLabel": "<one of: Excellent, Good, Fair, Needs Attention>"\n}\n\nTips must be specific to their answers, actionable today, and suit Indian lifestyle. One sentence each.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);
    res.json({
      summary: data.summary ?? "",
      tips: Array.isArray(data.tips) ? data.tips : [],
      highlights: data.highlights ?? {},
      overallScore: typeof data.overallScore === "number" ? data.overallScore : 5,
      overallLabel: data.overallLabel ?? "Fair",
      date: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Questionnaire analysis failed");
    res.status(500).json({ error: "Failed to analyze questionnaire" });
  }
});

router.post("/health-records/analyze-patterns", async (req, res) => {
  const parsed = AnalyzeHealthPatternsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "At least two valid health-history events are required" });
    return;
  }

  const { events, language } = parsed.data;
  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", hi: "Hindi", bn: "Bengali", as: "Assamese", gu: "Gujarati",
    kn: "Kannada", ml: "Malayalam", mr: "Marathi", ne: "Nepali", or: "Odia",
    pa: "Punjabi", ta: "Tamil", te: "Telugu", ur: "Urdu", mni: "Meitei (Manipuri)",
    ks: "Kashmiri", mai: "Maithili", kok: "Konkani", doi: "Dogri", brx: "Bodo",
    sat: "Santali", sd: "Sindhi", sa: "Sanskrit",
  };
  const languageName = LANGUAGE_NAMES[language] ?? "English";
  const eventText = events
    .map((event, index) => `Event ${index + 1} (${event.sourceType}, ${event.occurredAt}):\n${event.text}`)
    .join("\n\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You analyze a patient's longitudinal, patient-reported health history for recurring observations. You do not diagnose, predict disease, or claim causation. Only report a pattern when substantially similar symptoms, triggers, or circumstances appear in at least two separate events. Ignore repeated boilerplate, disclaimers, and clinician advice. Write in ${languageName}.`,
        },
        {
          role: "user",
          content: `Review these health-history events and return ONLY valid JSON:
${eventText}

Format:
{
  "patterns": [
    {
      "title": "<short neutral title>",
      "observation": "<one concise sentence such as: You reported headaches after missed sleep in 3 separate entries. Use may/appears; never say causes.>",
      "evidenceCount": <integer, minimum 2>,
      "confidence": "possible" | "recurring",
      "caution": "<short reminder that this is an observation, not a diagnosis>"
    }
  ]
}

Rules:
- Return at most 4 patterns.
- Every pattern must be supported by at least 2 separate numbered events.
- Do not say the person has a tendency to get an infection unless an infection was explicitly clinician-diagnosed in multiple events.
- Do not infer allergies, intolerances, diagnoses, or causal relationships.
- If there is no defensible repeated pattern, return {"patterns":[]}.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{\"patterns\":[]}";
    const data = JSON.parse(raw) as { patterns?: Array<Record<string, unknown>> };
    const patterns = Array.isArray(data.patterns)
      ? data.patterns
          .filter((item) => Number(item.evidenceCount) >= 2)
          .slice(0, 4)
          .map((item) => ({
            title: String(item.title ?? "Recurring observation"),
            observation: String(item.observation ?? ""),
            evidenceCount: Math.max(2, Number(item.evidenceCount) || 2),
            confidence: item.confidence === "recurring" ? "recurring" as const : "possible" as const,
            caution: String(item.caution ?? "This is an observation from your history, not a diagnosis."),
          }))
          .filter((item) => item.observation.length > 0)
      : [];

    res.json({
      patterns,
      analyzedAt: new Date().toISOString(),
      disclaimer: "These are AI-observed repetitions in your own records, not diagnoses or proof that one factor caused another.",
    });
  } catch (err) {
    req.log.error({ err }, "Longitudinal pattern analysis failed");
    res.status(500).json({ error: "Failed to analyze health history" });
  }
});

router.get("/surgeries", async (req, res) => {
  const parsed = ListSurgeriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const surgeries = await db
    .select()
    .from(surgeriesTable)
    .where(eq(surgeriesTable.userId, parsed.data.userId))
    .orderBy(desc(surgeriesTable.createdAt));
  res.json(surgeries);
});

router.post("/surgeries", async (req, res) => {
  const parsed = CreateSurgeryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [surgery] = await db.insert(surgeriesTable).values(parsed.data).returning();
  res.status(201).json(surgery);
});

router.delete("/surgeries/:id", async (req, res) => {
  const parsed = DeleteSurgeryParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db.delete(surgeriesTable).where(eq(surgeriesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;

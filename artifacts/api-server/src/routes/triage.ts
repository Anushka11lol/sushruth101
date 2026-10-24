import { Router } from "express";
import { db } from "@workspace/db";
import { triageSessionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  ListTriageSessionsQueryParams,
  CreateTriageSessionBody,
  GetTriageSessionParams,
  GetTriageSummaryQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/triage", async (req, res) => {
  const parsed = ListTriageSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const sessions = await db
    .select()
    .from(triageSessionsTable)
    .where(eq(triageSessionsTable.userId, parsed.data.userId))
    .orderBy(desc(triageSessionsTable.createdAt));
  res.json(sessions);
});

router.post("/triage", async (req, res) => {
  const parsed = CreateTriageSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { userId, symptoms, language = "en" } = parsed.data;

  let urgencyLevel = "low";
  let specialistRecommended = "General Physician";
  let careSuggestion = "home_care";
  let aiSummary = "";

  try {
    const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", hi: "Hindi", bn: "Bengali", as: "Assamese", gu: "Gujarati",
    kn: "Kannada", ml: "Malayalam", mr: "Marathi", ne: "Nepali", or: "Odia",
    pa: "Punjabi", ta: "Tamil", te: "Telugu", ur: "Urdu", mni: "Meitei (Manipuri)",
    ks: "Kashmiri", mai: "Maithili", kok: "Konkani", doi: "Dogri", brx: "Bodo",
    sat: "Santali", sd: "Sindhi", sa: "Sanskrit",
  };
  const langName = LANGUAGE_NAMES[language] ?? "English";

  const prompt = `You are Sushruth, an AI healthcare triage assistant. You MUST NOT diagnose diseases or prescribe medicines. Your role is to provide preliminary healthcare guidance only.

First, decide whether the input is a genuine description of physical or mental health symptoms, a medical concern, or a health-related question. Set "isValidMedicalInput" to false if the input is:
- Random characters, gibberish, or keyboard mashing (e.g. "asdfgh", "qwerty123")
- Completely unrelated to health (e.g. "pizza recipe", "football score", "hello world")
- Offensive, nonsensical, or test text with no medical meaning
Set "isValidMedicalInput" to true for anything that could reasonably be a health symptom or concern, even if described informally or in any Indian language.

The user's preferred language is: ${langName} (code: ${language}).

Input: "${symptoms}"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "isValidMedicalInput": true | false,
  "urgencyLevel": "low" | "moderate" | "high" | "emergency",
  "specialistRecommended": "<English specialist type e.g. Cardiologist, ENT Specialist, General Physician>",
  "careSuggestion": "home_care" | "clinic_visit" | "emergency_care",
  "aiSummary": "<2-3 sentence summary in ${langName} about what the symptoms might indicate and next steps. Do NOT name a specific disease as a diagnosis. Leave empty string if isValidMedicalInput is false.>"
}

Rules (apply only when isValidMedicalInput is true):
- "emergency" urgency: life-threatening situation (chest pain + shortness of breath, loss of consciousness, severe bleeding, etc.)
- "high": serious but not immediately life-threatening
- "moderate": needs professional attention soon
- "low": mild, can be managed at home
- Always recommend consulting a doctor for proper diagnosis`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 512,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed_ai = JSON.parse(raw);

    if (parsed_ai.isValidMedicalInput === false) {
      res.status(422).json({ error: "NOT_MEDICAL_INPUT" });
      return;
    }

    urgencyLevel = parsed_ai.urgencyLevel ?? "low";
    specialistRecommended = parsed_ai.specialistRecommended ?? "General Physician";
    careSuggestion = parsed_ai.careSuggestion ?? "home_care";
    aiSummary = parsed_ai.aiSummary ?? "";
  } catch (err) {
    req.log.error({ err }, "AI triage failed, using defaults");
    urgencyLevel = "moderate";
    aiSummary = "Unable to analyze symptoms at this time. Please consult a doctor.";
  }

  const [session] = await db
    .insert(triageSessionsTable)
    .values({
      userId,
      symptoms,
      urgencyLevel,
      specialistRecommended,
      careSuggestion,
      aiSummary,
      disclaimer:
        "AI Disclaimer: This is not a medical diagnosis. Please consult a certified doctor for proper diagnosis and treatment.",
    })
    .returning();

  res.status(201).json(session);
});

router.get("/triage/summary", async (req, res) => {
  const parsed = GetTriageSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const sessions = await db
    .select()
    .from(triageSessionsTable)
    .where(eq(triageSessionsTable.userId, parsed.data.userId))
    .orderBy(desc(triageSessionsTable.createdAt));

  const counts = { low: 0, moderate: 0, high: 0, emergency: 0 };
  for (const s of sessions) {
    const lvl = s.urgencyLevel as keyof typeof counts;
    if (lvl in counts) counts[lvl]++;
  }

  res.json({
    total: sessions.length,
    ...counts,
    recentSessions: sessions.slice(0, 5),
  });
});

router.get("/triage/:id", async (req, res) => {
  const parsed = GetTriageSessionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [session] = await db
    .select()
    .from(triageSessionsTable)
    .where(eq(triageSessionsTable.id, parsed.data.id));
  if (!session) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(session);
});

router.delete("/triage/:id", async (req, res) => {
  const parsed = GetTriageSessionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [deleted] = await db
    .delete(triageSessionsTable)
    .where(eq(triageSessionsTable.id, parsed.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});

export default router;

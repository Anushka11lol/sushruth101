import { Router } from "express";
import { db } from "@workspace/db";
import { trackerEntriesTable } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";
import {
  ListTrackerEntriesQueryParams,
  CreateTrackerEntryBody,
  GetTrackerInsightsQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/tracker", async (req, res) => {
  const parsed = ListTrackerEntriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const days = parsed.data.days ?? 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const entries = await db
    .select()
    .from(trackerEntriesTable)
    .where(eq(trackerEntriesTable.userId, parsed.data.userId))
    .orderBy(desc(trackerEntriesTable.createdAt))
    .limit(days);

  const mapped = entries.map((e) => ({
    ...e,
    hydration: e.hydration ? Number(e.hydration) : null,
    sleepHours: e.sleepHours ? Number(e.sleepHours) : null,
  }));

  res.json(mapped);
});

router.post("/tracker", async (req, res) => {
  const parsed = CreateTrackerEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [entry] = await db
    .insert(trackerEntriesTable)
    .values({
      ...parsed.data,
      hydration: parsed.data.hydration !== undefined && parsed.data.hydration !== null ? String(parsed.data.hydration) : null,
      sleepHours: parsed.data.sleepHours !== undefined && parsed.data.sleepHours !== null ? String(parsed.data.sleepHours) : null,
    })
    .returning();
  res.status(201).json({
    ...entry,
    hydration: entry.hydration ? Number(entry.hydration) : null,
    sleepHours: entry.sleepHours ? Number(entry.sleepHours) : null,
  });
});

router.get("/tracker/insights", async (req, res) => {
  const parsed = GetTrackerInsightsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const entries = await db
    .select()
    .from(trackerEntriesTable)
    .where(eq(trackerEntriesTable.userId, parsed.data.userId))
    .orderBy(desc(trackerEntriesTable.createdAt))
    .limit(7);

  if (entries.length === 0) {
    res.json({
      userId: parsed.data.userId,
      insights: "Not enough data yet. Start logging your daily health to see personalized insights.",
      riskLevel: "low",
      tips: [
        "Log your daily hydration (aim for 8 glasses/day)",
        "Track your sleep (aim for 7-8 hours)",
        "Record your activity, mood, and any symptoms",
      ],
      weeklyAvgSleep: null,
      weeklyAvgHydration: null,
      weeklyAvgStress: null,
    });
    return;
  }

  const avgSleep = entries.reduce((s, e) => s + (Number(e.sleepHours) || 0), 0) / entries.length;
  const avgHydration = entries.reduce((s, e) => s + (Number(e.hydration) || 0), 0) / entries.length;
  const stressEntries = entries.filter((entry) => entry.stressLevel != null);
  const avgStress = stressEntries.length
    ? stressEntries.reduce((sum, entry) => sum + Number(entry.stressLevel), 0) / stressEntries.length
    : null;

  let insights = "";
  let riskLevel: "low" | "moderate" | "high" = "low";
  let tips: string[] = [];

  try {
    const summaryStr = entries
      .map(
        (e) =>
          `Date: ${e.date}, Sleep: ${e.sleepHours}h, Hydration: ${e.hydration}L, Activity: ${e.activityMinutes}min, Mood: ${e.mood}, Symptoms: ${e.symptoms || "none"}`,
      )
      .join("\n");

    const prompt = `You are Sushruth, an AI preventive health advisor. You MUST NOT diagnose diseases.

Analyze the last 7 days of health tracking data and provide JSON:
{
  "insights": "<2-3 sentences describing health trends and what they mean, in simple language>",
  "riskLevel": "low" | "moderate" | "high",
  "tips": ["<tip1>", "<tip2>", "<tip3>", "<tip4>"]
}

Health Data (last 7 days):
${summaryStr}

Weekly Averages: Sleep ${avgSleep.toFixed(1)}h, Hydration ${avgHydration.toFixed(1)}L`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 512,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const ai = JSON.parse(raw);
    insights = ai.insights ?? "";
    riskLevel = ai.riskLevel ?? "low";
    tips = ai.tips ?? [];
  } catch (err) {
    req.log.error({ err }, "AI insights generation failed");
    insights = "Your health data has been logged. Keep tracking to see trends.";
    if (avgSleep < 6) { riskLevel = "moderate"; tips.push("Try to get at least 7-8 hours of sleep"); }
    if (avgHydration < 1.5) tips.push("Increase your water intake to at least 2L daily");
    if (tips.length === 0) tips.push("Keep maintaining your healthy habits!");
  }

  res.json({
    userId: parsed.data.userId,
    insights,
    riskLevel,
    tips,
    weeklyAvgSleep: Math.round(avgSleep * 10) / 10,
    weeklyAvgHydration: Math.round(avgHydration * 10) / 10,
    weeklyAvgStress: avgStress == null ? null : Math.round(avgStress * 10) / 10,
  });
});

export default router;

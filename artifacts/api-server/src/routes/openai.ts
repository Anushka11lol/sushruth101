import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();
const SCREEN_READER_LANGUAGES = new Set([
  "en", "hi", "bn", "as", "gu", "kn", "ml", "mr", "ne", "or", "pa", "ta",
  "te", "ur", "mni", "ks", "mai", "kok", "doi", "brx", "sat", "sd", "sa",
]);
const SCREEN_READER_LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  en: "English", hi: "Hindi", bn: "Bengali", as: "Assamese", gu: "Gujarati",
  kn: "Kannada", ml: "Malayalam", mr: "Marathi", ne: "Nepali", or: "Odia",
  pa: "Punjabi", ta: "Tamil", te: "Telugu", ur: "Urdu", mni: "Meitei (Manipuri)",
  ks: "Kashmiri", mai: "Maithili", kok: "Konkani", doi: "Dogri", brx: "Bodo",
  sat: "Santali", sd: "Sindhi", sa: "Sanskrit",
};

router.post("/screen-reader/speech", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.replace(/\s+/g, " ").trim() : "";
  const language = typeof req.body?.language === "string" ? req.body.language : "";
  if (!text || text.length > 500 || !SCREEN_READER_LANGUAGES.has(language)) {
    res.status(400).json({ error: "Valid language and text of up to 500 characters are required" });
    return;
  }
  try {
    const languageName = SCREEN_READER_LANGUAGE_NAMES[language];
    const response = await openai.chat.completions.create({
      model: "gpt-audio-mini",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "mp3" },
      messages: [
        {
          role: "system",
          content: `You are an accessible screen reader. Speak in ${languageName}. If the interface text is in another language, translate it naturally into ${languageName} before speaking. Preserve personal names, medicine names, numbers, units, and abbreviations. Do not add explanations or commentary.`,
        },
        { role: "user", content: text },
      ],
    });
    const audioData = (response.choices[0]?.message as { audio?: { data?: string } })?.audio?.data ?? "";
    const audio = Buffer.from(audioData, "base64");
    if (!audio.length) throw new Error("Speech model returned no audio");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(audio);
  } catch (err) {
    req.log.error({ err, language }, "Screen reader speech generation failed");
    res.status(502).json({ error: "Unable to generate speech" });
  }
});

router.get("/openai/conversations", async (req, res) => {
  const all = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(all);
});

router.post("/openai/conversations", async (req, res) => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title })
    .returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const parsed = GetOpenaiConversationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, parsed.data.id));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(conv);
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const parsed = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db.delete(conversations).where(eq(conversations.id, parsed.data.id));
  res.status(204).send();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const parsed = ListOpenaiMessagesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, parsed.data.id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendOpenaiMessageParams.safeParse(req.params);
  const bodyParsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const convId = paramsParsed.data.id;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [userMsg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      role: "user",
      content: bodyParsed.data.content,
    })
    .returning();

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  const systemPrompt = `You are Sushruth, a caring AI healthcare companion designed for patients in India. You help users understand health information, navigate the healthcare system, and make informed decisions.

IMPORTANT RULES:
- You MUST NOT diagnose diseases or prescribe medications
- Always recommend consulting a certified doctor for diagnosis and treatment
- Be empathetic, clear, and use simple language accessible to non-medical users
- Be culturally sensitive to Indian healthcare context
- For emergencies, always urge calling 108 (India's emergency number) or going to the nearest hospital
- End responses with: "Remember, this information is for general guidance only. Please consult a certified doctor for proper diagnosis and treatment."`;

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let assistantContent = "";
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: chatMessages,
    });
    assistantContent = response.choices[0]?.message?.content ?? "I'm sorry, I couldn't process that. Please try again.";
  } catch (err) {
    req.log.error({ err }, "OpenAI chat failed");
    assistantContent = "I'm having trouble connecting right now. Please try again in a moment.";
  }

  const [assistantMsg] = await db
    .insert(messages)
    .values({
      conversationId: convId,
      role: "assistant",
      content: assistantContent,
    })
    .returning();

  res.json(assistantMsg);
});

export default router;

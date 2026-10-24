import { Router } from "express";
import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetUserProfileParams,
  UpsertUserProfileParams,
  UpsertUserProfileBody,
} from "@workspace/api-zod";
import { ensureSushruthProfile } from "./sushruthIdentity";

const router = Router();

router.get("/profile/:userId", async (req, res) => {
  const parsed = GetUserProfileParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const profile = await ensureSushruthProfile(parsed.data.userId);
  res.json(profile);
});

router.put("/profile/:userId", async (req, res) => {
  const paramsParsed = UpsertUserProfileParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyParsed = UpsertUserProfileBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { userId } = paramsParsed.data;
  const existing = await ensureSushruthProfile(userId);
  const fields = {
    phone: bodyParsed.data.phone ?? null,
    locationText: bodyParsed.data.locationText ?? null,
    city: bodyParsed.data.city ?? null,
    state: bodyParsed.data.state ?? null,
    pincode: bodyParsed.data.pincode ?? null,
  };
  const [profile] = await db
    .insert(userProfilesTable)
    .values({ userId, sushruthId: existing.sushruthId, ...fields })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: { ...fields, updatedAt: new Date() },
    })
    .returning();
  res.json(profile);
});

export default router;

import { randomBytes } from "node:crypto";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const createCandidate = () => {
  const bytes = randomBytes(6);
  let suffix = "";
  for (const byte of bytes) suffix += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `SUS-${suffix}`;
};

export const ensureSushruthProfile = async (userId: string) => {
  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));
  if (existing?.sushruthId) return existing;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const [profile] = await db
        .insert(userProfilesTable)
        .values({ userId, sushruthId: createCandidate() })
        .onConflictDoUpdate({
          target: userProfilesTable.userId,
          set: { sushruthId: createCandidate(), updatedAt: new Date() },
        })
        .returning();
      if (profile.sushruthId) return profile;
    } catch (error) {
      if (attempt === 7) throw error;
    }
  }
  throw new Error("Unable to assign Sushruth ID");
};
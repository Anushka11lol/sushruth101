import { Router } from "express";
import { db } from "@workspace/db";
import {
  careCircleMembersTable,
  careAlertsTable,
  medicationsTable,
  medicationLogsTable,
  careCircleVaultItemsTable,
  careCircleIdentityVerificationsTable,
  careCircleDutiesTable,
  careCircleDailyCareLogsTable,
  careCircleConnectionsTable,
  emergencyAlertsTable,
  careCircleEmergencyRecipientsTable,
  userProfilesTable,
} from "@workspace/db";
import { eq, desc, and, gte, or, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getAuth } from "@clerk/express";
import {
  ListCareCircleMembersQueryParams,
  AddCareCircleMemberBody,
  RemoveCareCircleMemberParams,
  ListCareCircleAlertsQueryParams,
  SendCareCircleEmergencyAlertBody,
  GetSushruthIdentityQueryParams,
  ListCareCircleConnectionRequestsQueryParams,
  CreateCareCircleConnectionRequestBody,
  RespondToCareCircleConnectionRequestParams,
  RespondToCareCircleConnectionRequestBody,
  ListEmergencyAlertHistoryQueryParams,
  AcknowledgeEmergencyAlertParams,
  AcknowledgeEmergencyAlertBody,
  ListCareCircleVaultItemsQueryParams,
  CreateCareCircleVaultItemBody,
  DeleteCareCircleVaultItemParams,
  RequestCareCircleVaultUploadUrlBody,
  GetCareCircleVaultDownloadUrlParams,
  GetCareCircleVaultDownloadUrlQueryParams,
  ListCareCircleIdentityVerificationsQueryParams,
  CreateCareCircleIdentityVerificationBody,
  ListCareCircleDutiesQueryParams,
  CreateCareCircleDutyBody,
  DeleteCareCircleDutyParams,
  ListCareCircleDailyCareLogsQueryParams,
  CreateCareCircleDailyCareLogBody,
  DeleteCareCircleDailyCareLogParams,
} from "@workspace/api-zod";
import { ensureSushruthProfile } from "./sushruthIdentity";

const router = Router();

router.use(
  ["/care-circle/emergency-alert", "/care-circle/emergency-alerts"],
  (_req, res) => {
    res.status(503).json({ error: "Feature under development" });
  },
);
const SIDECAR_URL = "http://127.0.0.1:1106";

const ownsSession = (req: Parameters<typeof getAuth>[0], claimedUserId: string) =>
  getAuth(req).userId === claimedUserId;

const memberBelongsToUser = async (memberId: number, userId: string) => {
  const [member] = await db
    .select()
    .from(careCircleMembersTable)
    .where(and(eq(careCircleMembersTable.id, memberId), eq(careCircleMembersTable.userId, userId)));
  return member;
};

const signPrivateObjectUrl = async (objectPath: string, method: "GET" | "PUT" | "DELETE", ttlSec = 900) => {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) throw new Error("Private object storage is not configured");
  const relativePath = objectPath.replace(/^\/objects\//, "");
  const fullPath = `${privateDir.replace(/\/$/, "")}/${relativePath}`;
  const parts = fullPath.replace(/^\//, "").split("/");
  const response = await fetch(`${SIDECAR_URL}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: parts[0],
      object_name: parts.slice(1).join("/"),
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Failed to sign private object URL (${response.status})`);
  const payload = await response.json() as { signed_url: string };
  return payload.signed_url;
};

router.get("/care-circle", async (req, res) => {
  const parsed = ListCareCircleMembersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const members = await db
    .select()
    .from(careCircleMembersTable)
    .where(eq(careCircleMembersTable.userId, parsed.data.userId))
    .orderBy(desc(careCircleMembersTable.createdAt));
  res.json(members);
});

router.post("/care-circle", async (req, res) => {
  const parsed = AddCareCircleMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [member] = await db.insert(careCircleMembersTable).values(parsed.data).returning();
  res.status(201).json(member);
});

router.delete("/care-circle/:id", async (req, res) => {
  const parsed = RemoveCareCircleMemberParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db.delete(careCircleMembersTable).where(eq(careCircleMembersTable.id, parsed.data.id));
  res.status(204).send();
});

router.get("/care-circle/alerts", async (req, res) => {
  const parsed = ListCareCircleAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const members = await db
    .select()
    .from(careCircleMembersTable)
    .where(eq(careCircleMembersTable.userId, parsed.data.userId));

  const generatedAlerts = [];

  for (const member of members) {
    if (member.linkedUserId) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);

      const meds = await db
        .select()
        .from(medicationsTable)
        .where(and(eq(medicationsTable.userId, member.linkedUserId), eq(medicationsTable.isActive, true)));

      for (const med of meds) {
        const recentLogs = await db
          .select()
          .from(medicationLogsTable)
          .where(
            and(
              eq(medicationLogsTable.medicationId, med.id),
              gte(medicationLogsTable.takenAt, cutoff),
            ),
          );

        if (recentLogs.length === 0) {
          generatedAlerts.push({
            id: Date.now() + med.id,
            userId: parsed.data.userId,
            memberId: member.id,
            memberName: member.memberName,
            alertType: "missed_medication",
            message: `${member.memberName} hasn't taken their ${med.name} (${med.dosage}) for the last 3 days`,
            severity: "warning",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  const storedAlerts = await db
    .select()
    .from(careAlertsTable)
    .where(eq(careAlertsTable.userId, parsed.data.userId))
    .orderBy(desc(careAlertsTable.createdAt))
    .limit(20);

  res.json([...generatedAlerts, ...storedAlerts]);
});

router.post("/care-circle/emergency-alert", async (req, res) => {
  const parsed = SendCareCircleEmergencyAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid emergency alert" });
    return;
  }
  if (!ownsSession(req, parsed.data.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const profile = await ensureSushruthProfile(parsed.data.userId);
  const legacyMembers = await db
    .select()
    .from(careCircleMembersTable)
    .where(eq(careCircleMembersTable.userId, parsed.data.userId));
  const connections = await db
    .select()
    .from(careCircleConnectionsTable)
    .where(and(
      eq(careCircleConnectionsTable.status, "ACCEPTED"),
      or(
        eq(careCircleConnectionsTable.requesterUserId, parsed.data.userId),
        eq(careCircleConnectionsTable.recipientUserId, parsed.data.userId),
      ),
    ));
  const recipientsById = new Map<string, string>();
  legacyMembers.forEach((member) => {
    if (member.linkedUserId) recipientsById.set(member.linkedUserId, member.memberName);
  });
  connections.forEach((connection) => {
    const patientIsRequester = connection.requesterUserId === parsed.data.userId;
    recipientsById.set(
      patientIsRequester ? connection.recipientUserId : connection.requesterUserId,
      patientIsRequester ? (connection.recipientName || "Care Circle member") : connection.requesterName,
    );
  });
  recipientsById.delete(parsed.data.userId);
  const createdAt = new Date();
  const [emergencyAlert] = await db.insert(emergencyAlertsTable).values({
    patientUserId: parsed.data.userId,
    patientName: parsed.data.patientName,
    sushruthId: profile.sushruthId!,
    latitude: parsed.data.latitude == null ? null : String(parsed.data.latitude),
    longitude: parsed.data.longitude == null ? null : String(parsed.data.longitude),
    accuracyMeters: parsed.data.accuracyMeters == null ? null : Math.round(parsed.data.accuracyMeters),
    status: "SENT",
  }).returning();

  if (recipientsById.size > 0) {
    await db.insert(careCircleEmergencyRecipientsTable).values(
      [...recipientsById].map(([recipientUserId, recipientName]) => ({
        emergencyAlertId: emergencyAlert.id,
        recipientUserId,
        recipientName,
      })),
    );
  }

  res.status(201).json({
    id: emergencyAlert.id,
    alertedLinkedMembers: recipientsById.size,
    totalCareCircleMembers: recipientsById.size,
    createdAt: createdAt.toISOString(),
  });
});

router.get("/care-circle/identity", async (req, res) => {
  const parsed = GetSushruthIdentityQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }
  const profile = await ensureSushruthProfile(parsed.data.userId);
  res.json({ sushruthId: profile.sushruthId });
});

router.get("/care-circle/connection-requests", async (req, res) => {
  const parsed = ListCareCircleConnectionRequestsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }
  const rows = await db.select().from(careCircleConnectionsTable).where(or(
    eq(careCircleConnectionsTable.requesterUserId, parsed.data.userId),
    eq(careCircleConnectionsTable.recipientUserId, parsed.data.userId),
  )).orderBy(desc(careCircleConnectionsTable.createdAt));
  res.json(rows.map((row) => ({
    ...row,
    direction: row.recipientUserId === parsed.data.userId ? "INCOMING" : "OUTGOING",
  })));
});

router.post("/care-circle/connection-requests", async (req, res) => {
  const parsed = CreateCareCircleConnectionRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid connection request" }); return; }
  const targetId = parsed.data.targetSushruthId.trim().toUpperCase();
  const [recipient] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.sushruthId, targetId));
  if (!recipient) { res.status(404).json({ error: "Sushruth ID not found" }); return; }
  if (recipient.userId === parsed.data.userId) { res.status(400).json({ error: "You cannot connect to your own Sushruth ID" }); return; }
  const existing = await db.select().from(careCircleConnectionsTable).where(and(
    eq(careCircleConnectionsTable.requesterUserId, parsed.data.userId),
    eq(careCircleConnectionsTable.recipientUserId, recipient.userId),
    eq(careCircleConnectionsTable.status, "PENDING"),
  ));
  if (existing.length > 0) { res.status(409).json({ error: "A request is already pending" }); return; }
  const [row] = await db.insert(careCircleConnectionsTable).values({
    requesterUserId: parsed.data.userId,
    requesterName: parsed.data.requesterName,
    recipientUserId: recipient.userId,
    relationship: parsed.data.relationship ?? null,
    status: "PENDING",
  }).returning();
  res.status(201).json({ ...row, direction: "OUTGOING" });
});

router.patch("/care-circle/connection-requests/:id", async (req, res) => {
  const params = RespondToCareCircleConnectionRequestParams.safeParse(req.params);
  const body = RespondToCareCircleConnectionRequestBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid response" }); return; }
  const [request] = await db.select().from(careCircleConnectionsTable).where(and(
    eq(careCircleConnectionsTable.id, params.data.id),
    eq(careCircleConnectionsTable.recipientUserId, body.data.userId),
    eq(careCircleConnectionsTable.status, "PENDING"),
  ));
  if (!request) { res.status(404).json({ error: "Pending request not found" }); return; }
  const accepted = body.data.action === "ACCEPT";
  const [updated] = await db.update(careCircleConnectionsTable).set({
    recipientName: body.data.recipientName,
    relationship: body.data.relationship ?? request.relationship,
    status: accepted ? "ACCEPTED" : "REJECTED",
    acceptedAt: accepted ? new Date() : null,
  }).where(eq(careCircleConnectionsTable.id, request.id)).returning();
  if (accepted) {
    await db.insert(careCircleMembersTable).values([
      {
        userId: request.requesterUserId,
        memberName: body.data.recipientName,
        relationship: body.data.relationship ?? request.relationship ?? "Other",
        linkedUserId: request.recipientUserId,
        careRole: "family_member",
      },
      {
        userId: request.recipientUserId,
        memberName: request.requesterName,
        relationship: body.data.relationship ?? request.relationship ?? "Other",
        linkedUserId: request.requesterUserId,
        careRole: "family_member",
      },
    ]);
  }
  res.json({ ...updated, direction: "INCOMING" });
});

router.get("/care-circle/emergency-alerts", async (req, res) => {
  const parsed = ListEmergencyAlertHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }
  const received = await db.select().from(careCircleEmergencyRecipientsTable)
    .where(eq(careCircleEmergencyRecipientsTable.recipientUserId, parsed.data.userId));
  if (received.some((item) => item.seenAt == null)) {
    await db.update(careCircleEmergencyRecipientsTable).set({ seenAt: new Date() }).where(and(
      eq(careCircleEmergencyRecipientsTable.recipientUserId, parsed.data.userId),
      isNull(careCircleEmergencyRecipientsTable.seenAt),
    ));
    received.forEach((item) => {
      if (item.seenAt == null) item.seenAt = new Date();
    });
  }
  const own = await db.select().from(emergencyAlertsTable)
    .where(eq(emergencyAlertsTable.patientUserId, parsed.data.userId));
  const receivedAlerts = received.length
    ? await db.select().from(emergencyAlertsTable).where(inArray(emergencyAlertsTable.id, received.map((item) => item.emergencyAlertId)))
    : [];
  const alertsById = new Map([...own, ...receivedAlerts].map((alert) => [alert.id, alert]));
  const alertIds = [...alertsById.keys()];
  const recipients = alertIds.length
    ? await db.select().from(careCircleEmergencyRecipientsTable).where(inArray(careCircleEmergencyRecipientsTable.emergencyAlertId, alertIds))
    : [];
  res.json([...alertsById.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map((alert) => ({
    ...alert,
    latitude: alert.latitude == null ? null : Number(alert.latitude),
    longitude: alert.longitude == null ? null : Number(alert.longitude),
    direction: alert.patientUserId === parsed.data.userId ? "SENT" : "RECEIVED",
    recipients: recipients.filter((recipient) => recipient.emergencyAlertId === alert.id).map((recipient) => ({
      recipientName: recipient.recipientName,
      status: recipient.acknowledgedAt ? "RESPONDING" : recipient.seenAt ? "SEEN" : "SENT",
      sentAt: recipient.sentAt,
      seenAt: recipient.seenAt,
      acknowledgedAt: recipient.acknowledgedAt,
    })),
  })));
});

router.post("/care-circle/emergency-alerts/:id/acknowledge", async (req, res) => {
  const params = AcknowledgeEmergencyAlertParams.safeParse(req.params);
  const body = AcknowledgeEmergencyAlertBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid acknowledgement" }); return; }
  const [recipient] = await db.select().from(careCircleEmergencyRecipientsTable).where(and(
    eq(careCircleEmergencyRecipientsTable.emergencyAlertId, params.data.id),
    eq(careCircleEmergencyRecipientsTable.recipientUserId, body.data.userId),
  ));
  if (!recipient) { res.status(404).json({ error: "Emergency alert not found" }); return; }
  await db.update(careCircleEmergencyRecipientsTable).set({
    seenAt: recipient.seenAt ?? new Date(),
    acknowledgedAt: new Date(),
  }).where(eq(careCircleEmergencyRecipientsTable.id, recipient.id));
  await db.update(emergencyAlertsTable).set({ status: "ACKNOWLEDGED" }).where(eq(emergencyAlertsTable.id, params.data.id));
  res.json({ success: true });
});

router.post("/care-circle/vault/upload-url", async (req, res) => {
  const parsed = RequestCareCircleVaultUploadUrlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid upload metadata" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(parsed.data.contentType) || parsed.data.fileSize > 10 * 1024 * 1024) {
    res.status(400).json({ error: "Use a PDF, JPG, PNG, or WebP file up to 10 MB" });
    return;
  }
  try {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    const uploadURL = await signPrivateObjectUrl(objectPath, "PUT");
    res.json({ uploadURL, objectPath, expiresIn: 900 });
  } catch (error) {
    req.log.error({ err: error }, "Care vault upload signing failed");
    res.status(500).json({ error: "Unable to prepare private upload" });
  }
});

router.get("/care-circle/vault", async (req, res) => {
  const parsed = ListCareCircleVaultItemsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const filters = [eq(careCircleVaultItemsTable.userId, parsed.data.userId)];
  if (parsed.data.memberId) filters.push(eq(careCircleVaultItemsTable.memberId, parsed.data.memberId));
  const rows = await db.select().from(careCircleVaultItemsTable).where(and(...filters)).orderBy(desc(careCircleVaultItemsTable.createdAt));
  res.json(rows);
});

router.post("/care-circle/vault", async (req, res) => {
  const parsed = CreateCareCircleVaultItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid vault document" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!await memberBelongsToUser(parsed.data.memberId, parsed.data.userId)) {
    res.status(404).json({ error: "Care Circle member not found" }); return;
  }
  if (!/^\/objects\/uploads\/[0-9a-f-]+$/i.test(parsed.data.objectPath)) {
    res.status(400).json({ error: "Invalid private object path" }); return;
  }
  const [row] = await db.insert(careCircleVaultItemsTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.get("/care-circle/vault/:id/download-url", async (req, res) => {
  const id = GetCareCircleVaultDownloadUrlParams.safeParse(req.params);
  const query = GetCareCircleVaultDownloadUrlQueryParams.safeParse(req.query);
  if (!id.success || !query.success) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!ownsSession(req, query.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.select().from(careCircleVaultItemsTable).where(and(eq(careCircleVaultItemsTable.id, id.data.id), eq(careCircleVaultItemsTable.userId, query.data.userId)));
  if (!row) { res.status(404).json({ error: "Vault document not found" }); return; }
  try {
    const downloadURL = await signPrivateObjectUrl(row.objectPath, "GET", 300);
    res.json({ downloadURL, expiresIn: 300 });
  } catch (error) {
    req.log.error({ err: error }, "Care vault download signing failed");
    res.status(500).json({ error: "Unable to open private document" });
  }
});

router.delete("/care-circle/vault/:id", async (req, res) => {
  const parsed = DeleteCareCircleVaultItemParams.safeParse(req.params);
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!parsed.success || !userId) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!ownsSession(req, userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.select().from(careCircleVaultItemsTable).where(and(eq(careCircleVaultItemsTable.id, parsed.data.id), eq(careCircleVaultItemsTable.userId, userId)));
  if (!row) { res.status(404).json({ error: "Vault document not found" }); return; }
  try {
    const deleteURL = await signPrivateObjectUrl(row.objectPath, "DELETE", 300);
    const deleted = await fetch(deleteURL, { method: "DELETE" });
    if (!deleted.ok && deleted.status !== 404) throw new Error(`Object delete failed (${deleted.status})`);
    await db.delete(careCircleVaultItemsTable).where(eq(careCircleVaultItemsTable.id, row.id));
    res.status(204).send();
  } catch (error) {
    req.log.error({ err: error }, "Care vault delete failed");
    res.status(500).json({ error: "Unable to delete private document" });
  }
});

router.get("/care-circle/identity-verifications", async (req, res) => {
  const parsed = ListCareCircleIdentityVerificationsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(careCircleIdentityVerificationsTable).where(eq(careCircleIdentityVerificationsTable.userId, parsed.data.userId)).orderBy(desc(careCircleIdentityVerificationsTable.submittedAt));
  res.json(rows);
});

router.post("/care-circle/identity-verifications", async (req, res) => {
  const parsed = CreateCareCircleIdentityVerificationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid verification submission" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const member = await memberBelongsToUser(parsed.data.memberId, parsed.data.userId);
  const [vaultItem] = await db.select().from(careCircleVaultItemsTable).where(and(
    eq(careCircleVaultItemsTable.id, parsed.data.documentVaultItemId),
    eq(careCircleVaultItemsTable.userId, parsed.data.userId),
    eq(careCircleVaultItemsTable.memberId, parsed.data.memberId),
  ));
  if (!member || !vaultItem) { res.status(404).json({ error: "Member or identity document not found" }); return; }
  const [row] = await db.insert(careCircleIdentityVerificationsTable).values({ ...parsed.data, status: "pending_review" }).returning();
  await db.update(careCircleMembersTable).set({ verificationStatus: "pending_review" }).where(eq(careCircleMembersTable.id, member.id));
  res.status(201).json(row);
});

router.get("/care-circle/duties", async (req, res) => {
  const parsed = ListCareCircleDutiesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const filters = [eq(careCircleDutiesTable.userId, parsed.data.userId), eq(careCircleDutiesTable.isActive, true)];
  if (parsed.data.memberId) filters.push(eq(careCircleDutiesTable.memberId, parsed.data.memberId));
  const rows = await db.select().from(careCircleDutiesTable).where(and(...filters)).orderBy(desc(careCircleDutiesTable.createdAt));
  res.json(rows);
});

router.post("/care-circle/duties", async (req, res) => {
  const parsed = CreateCareCircleDutyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid care duty" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!await memberBelongsToUser(parsed.data.memberId, parsed.data.userId)) { res.status(404).json({ error: "Care recipient not found" }); return; }
  if (parsed.data.assignedToMemberId && !await memberBelongsToUser(parsed.data.assignedToMemberId, parsed.data.userId)) {
    res.status(404).json({ error: "Assigned caretaker not found" }); return;
  }
  const [row] = await db.insert(careCircleDutiesTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.delete("/care-circle/duties/:id", async (req, res) => {
  const parsed = DeleteCareCircleDutyParams.safeParse(req.params);
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!parsed.success || !userId) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!ownsSession(req, userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.update(careCircleDutiesTable).set({ isActive: false }).where(and(eq(careCircleDutiesTable.id, parsed.data.id), eq(careCircleDutiesTable.userId, userId))).returning();
  if (!row) { res.status(404).json({ error: "Duty not found" }); return; }
  res.status(204).send();
});

router.get("/care-circle/daily-care", async (req, res) => {
  const parsed = ListCareCircleDailyCareLogsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const filters = [eq(careCircleDailyCareLogsTable.userId, parsed.data.userId)];
  if (parsed.data.memberId) filters.push(eq(careCircleDailyCareLogsTable.memberId, parsed.data.memberId));
  if (parsed.data.careDate) {
    filters.push(eq(careCircleDailyCareLogsTable.careDate, parsed.data.careDate.toISOString().slice(0, 10)));
  }
  const rows = await db.select().from(careCircleDailyCareLogsTable).where(and(...filters)).orderBy(desc(careCircleDailyCareLogsTable.createdAt));
  res.json(rows);
});

router.post("/care-circle/daily-care", async (req, res) => {
  const parsed = CreateCareCircleDailyCareLogBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid daily care entry" }); return; }
  if (!ownsSession(req, parsed.data.userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!await memberBelongsToUser(parsed.data.memberId, parsed.data.userId)) { res.status(404).json({ error: "Care recipient not found" }); return; }
  const [row] = await db.insert(careCircleDailyCareLogsTable).values({
    ...parsed.data,
    careDate: parsed.data.careDate.toISOString().slice(0, 10),
  }).returning();
  res.status(201).json(row);
});

router.delete("/care-circle/daily-care/:id", async (req, res) => {
  const parsed = DeleteCareCircleDailyCareLogParams.safeParse(req.params);
  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  if (!parsed.success || !userId) { res.status(400).json({ error: "Invalid request" }); return; }
  if (!ownsSession(req, userId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const [row] = await db.delete(careCircleDailyCareLogsTable).where(and(eq(careCircleDailyCareLogsTable.id, parsed.data.id), eq(careCircleDailyCareLogsTable.userId, userId))).returning();
  if (!row) { res.status(404).json({ error: "Care entry not found" }); return; }
  res.status(204).send();
});

export default router;

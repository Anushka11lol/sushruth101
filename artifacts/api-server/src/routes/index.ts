import { Router, type IRouter } from "express";
import healthRouter from "./health";
import triageRouter from "./triage";
import reportsRouter from "./reports";
import appointmentsRouter from "./appointments";
import healthRecordsRouter from "./healthRecords";
import trackerRouter from "./tracker";
import careCircleRouter from "./careCircle";
import medicationsRouter from "./medications";
import openaiRouter from "./openai";
import profileRouter from "./profile";
import prescriptionsRouter from "./prescriptions";
import childHealthRouter from "./childHealth";
import portalRouter from "./portal";
import { getAuth } from "@clerk/express";
import sih26133Router from "./sih26133";
import healthWorkerRegistrationRouter from "./healthWorkerRegistration";
const router: IRouter = Router();

router.use(healthRouter);
router.use((req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const sources = [req.params, req.query, req.body].filter(Boolean) as Array<Record<string, unknown>>;
  const claimedIds = sources.flatMap((source) =>
    ["userId", "callerUserId", "patientUserId", "createdByUserId"]
      .map((key) => source[key])
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  // SIH endpoints perform resource-level authorization (worker membership,
  // facility scope, and patient ownership) in their router. Do not apply the
  // legacy patientUserId equality rule before those checks run.
  const isSihRoute = req.path.startsWith("/health-worker") || req.path.startsWith("/referrals") ||
    req.path.startsWith("/follow-ups") || req.path.startsWith("/facilities") ||
    req.path.startsWith("/inventory") || req.path.startsWith("/maternal-profiles") ||
    req.path.startsWith("/chronic-care") || req.path.startsWith("/investigations");
  if (!isSihRoute && claimedIds.some((claimed) => claimed !== userId)) {
    res.status(403).json({ error: "Authenticated user does not match requested health data" });
    return;
  }
  const imageBase64 = req.body?.imageBase64;
  if (typeof imageBase64 === "string") {
    const mimeType = req.body?.mimeType;
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    if (!allowedMimeTypes.has(mimeType) || imageBase64.length > 16_000_000) {
      res.status(413).json({ error: "Medical image must be JPEG, PNG, GIF, or WebP and no larger than 12 MB" });
      return;
    }
  }
  next();
});
router.use(triageRouter);
router.use(reportsRouter);
router.use(appointmentsRouter);
router.use(healthRecordsRouter);
router.use(trackerRouter);
router.use(careCircleRouter);
router.use(medicationsRouter);
router.use(openaiRouter);
router.use(profileRouter);
router.use(prescriptionsRouter);
router.use(childHealthRouter);
router.use(portalRouter);
router.use(healthWorkerRegistrationRouter);
router.use(sih26133Router);

export default router;

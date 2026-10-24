import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, doctorsTable } from "@workspace/db";
import { eq, desc, and, ilike } from "drizzle-orm";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  DeleteAppointmentParams,
  ListDoctorsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/doctors", async (req, res) => {
  const parsed = ListDoctorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  let query = db.select().from(doctorsTable);
  const conditions = [];
  if (parsed.data.name) {
    conditions.push(ilike(doctorsTable.name, `%${parsed.data.name}%`));
  }
  if (parsed.data.hospital) {
    conditions.push(ilike(doctorsTable.hospital, `%${parsed.data.hospital}%`));
  }
  if (parsed.data.specialty) {
    conditions.push(ilike(doctorsTable.specialty, `%${parsed.data.specialty}%`));
  }
  if (parsed.data.city) {
    conditions.push(ilike(doctorsTable.city, `%${parsed.data.city}%`));
  }

  let doctors;
  if (conditions.length > 0) {
    doctors = await db.select().from(doctorsTable).where(and(...conditions));
  } else {
    doctors = await db.select().from(doctorsTable);
  }

  const doctorsWithSlots = doctors.map((d) => ({
    ...d,
    fees: Number(d.fees),
    rating: Number(d.rating),
    availableSlots: JSON.parse(d.availableSlots ?? "[]"),
  }));

  res.json(doctorsWithSlots);
});

router.get("/appointments", async (req, res) => {
  const parsed = ListAppointmentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const appointments = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.userId, parsed.data.userId))
    .orderBy(desc(appointmentsTable.scheduledAt));

  const result = await Promise.all(
    appointments.map(async (a) => {
      const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, a.doctorId));
      return {
        ...a,
        doctor: doctor
          ? {
              ...doctor,
              fees: Number(doctor.fees),
              rating: Number(doctor.rating),
              availableSlots: JSON.parse(doctor.availableSlots ?? "[]"),
            }
          : null,
      };
    }),
  );

  res.json(result);
});

router.post("/appointments", async (req, res) => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { userId, doctorId, scheduledAt, reason, linkedTriageId, linkedReportId } = parsed.data;

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({
      userId,
      doctorId,
      scheduledAt: new Date(scheduledAt),
      reason,
      linkedTriageId: linkedTriageId ?? null,
      linkedReportId: linkedReportId ?? null,
    })
    .returning();

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));

  res.status(201).json({
    ...appointment,
    doctor: doctor
      ? {
          ...doctor,
          fees: Number(doctor.fees),
          rating: Number(doctor.rating),
          availableSlots: JSON.parse(doctor.availableSlots ?? "[]"),
        }
      : null,
  });
});

router.get("/appointments/:id", async (req, res) => {
  const parsed = GetAppointmentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [appointment] = await db
    .select()
    .from(appointmentsTable)
    .where(eq(appointmentsTable.id, parsed.data.id));
  if (!appointment) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, appointment.doctorId));
  res.json({
    ...appointment,
    doctor: doctor
      ? {
          ...doctor,
          fees: Number(doctor.fees),
          rating: Number(doctor.rating),
          availableSlots: JSON.parse(doctor.availableSlots ?? "[]"),
        }
      : null,
  });
});

router.patch("/appointments/:id", async (req, res) => {
  const paramsParsed = UpdateAppointmentParams.safeParse(req.params);
  const bodyParsed = UpdateAppointmentBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.status) updates.status = bodyParsed.data.status;
  if (bodyParsed.data.scheduledAt) updates.scheduledAt = new Date(bodyParsed.data.scheduledAt);

  const [updated] = await db
    .update(appointmentsTable)
    .set(updates)
    .where(eq(appointmentsTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, updated.doctorId));
  res.json({
    ...updated,
    doctor: doctor
      ? {
          ...doctor,
          fees: Number(doctor.fees),
          rating: Number(doctor.rating),
          availableSlots: JSON.parse(doctor.availableSlots ?? "[]"),
        }
      : null,
  });
});

router.delete("/appointments/:id", async (req, res) => {
  const parsed = DeleteAppointmentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;

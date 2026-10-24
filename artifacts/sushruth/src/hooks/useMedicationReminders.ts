import { useEffect, useRef, useCallback } from "react";

export interface MedForReminder {
  id: number;
  name: string;
  dosage: string;
  timings?: string | null;
  frequency: string;
  isActive: boolean | null;
}

function parseTimes(timings: string): string[] {
  const parts = timings
    .toLowerCase()
    .split(/[,;]/)
    .map((p) => p.trim());
  const times: string[] = [];
  for (const part of parts) {
    if (/morning|breakfast|am\b/i.test(part)) times.push("08:00");
    else if (/afternoon|lunch|noon/i.test(part)) times.push("13:00");
    else if (/evening|tea/i.test(part)) times.push("17:00");
    else if (/night|dinner|bed|pm\b/i.test(part)) times.push("21:00");
    const match = part.match(/(\d{1,2}):(\d{2})/);
    if (match) times.push(`${match[1].padStart(2, "0")}:${match[2]}`);
  }
  return times.length > 0 ? times : ["08:00"];
}

function deriveTimes(frequency: string): string[] {
  const f = frequency.toLowerCase();
  if (/twice/i.test(f)) return ["08:00", "21:00"];
  if (/three/i.test(f) || /3/i.test(f)) return ["08:00", "14:00", "21:00"];
  if (/4 hours/i.test(f)) return ["08:00", "12:00", "16:00", "20:00"];
  if (/6 hours/i.test(f)) return ["06:00", "12:00", "18:00", "24:00"];
  if (/8 hours/i.test(f)) return ["08:00", "16:00", "24:00"];
  if (/weekly/i.test(f)) return ["09:00"];
  return ["08:00"];
}

function getNotificationTimes(med: MedForReminder): string[] {
  if (med.timings && med.timings.trim()) {
    return parseTimes(med.timings);
  }
  return deriveTimes(med.frequency);
}

export function useMedicationReminders(
  medications: MedForReminder[] | undefined,
  enabled: boolean,
) {
  const notifiedRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!medications || medications.length === 0) return;

    const CHECK_INTERVAL_MS = 30_000;
    const WINDOW_MINUTES = 1;

    const check = () => {
      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const med of medications) {
        if (!med.isActive) continue;
        const times = getNotificationTimes(med);
        for (const t of times) {
          const [hh, mm] = t.split(":").map(Number);
          const diff =
            Math.abs(now.getHours() * 60 + now.getMinutes() - (hh * 60 + mm));
          if (diff <= WINDOW_MINUTES) {
            const key = `${med.id}-${t}-${now.toDateString()}`;
            if (!notifiedRef.current.has(key)) {
              notifiedRef.current.add(key);
              new Notification("💊 Medication Reminder — Sushruth", {
                body: `Time to take ${med.name} ${med.dosage}`,
                icon: "/favicon.svg",
                tag: `med-${med.id}-${t}`,
              });
            }
          }
        }
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [medications, enabled]);

  return { requestPermission };
}

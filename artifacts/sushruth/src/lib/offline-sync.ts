
/**
 * Sushruth offline-first health-record queue.
 *
 * Prototype only: localStorage is not encrypted.
 * Use synthetic data only until secure storage and server-side
 * idempotency are implemented.
 */

export type OfflineRecordStatus = "Pending" | "Failed" | "Synced";

export interface OfflineQueueItem<TPayload = Record<string, unknown>> {
  localId: string;
  userId: string;
  payload: TPayload;
  status: OfflineRecordStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  syncedAt?: string;
}

const STORAGE_PREFIX = "sushruth_offline_health_records_v1:";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function readQueue<TPayload>(
  userId: string,
): OfflineQueueItem<TPayload>[] {
  if (typeof window === "undefined" || !userId) return [];

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as OfflineQueueItem<TPayload>[])
      : [];
  } catch {
    return [];
  }
}

function writeQueue<TPayload>(
  userId: string,
  queue: OfflineQueueItem<TPayload>[],
): void {
  if (typeof window === "undefined" || !userId) {
    throw new Error("Offline queue requires a browser and valid user ID.");
  }

  window.localStorage.setItem(storageKey(userId), JSON.stringify(queue));
}

/** Get the locally queued records for one user. */
export function getOfflineQueue<TPayload = Record<string, unknown>>(
  userId: string,
): OfflineQueueItem<TPayload>[] {
  return readQueue<TPayload>(userId);
}

/** Save a record locally without requiring an internet connection. */
export function queueOfflineRecord<TPayload>(
  userId: string,
  payload: TPayload,
): OfflineQueueItem<TPayload> {
  if (!userId) {
    throw new Error("A user ID is required to queue an offline record.");
  }

  const now = new Date().toISOString();

  const item: OfflineQueueItem<TPayload> = {
    localId: makeId(),
    userId,
    payload,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
  };

  const queue = readQueue<TPayload>(userId);
  queue.push(item);
  writeQueue(userId, queue);

  return item;
}

/**
 * Retry queued records using Sushruth's existing API mutation.
 * The callback must reject if the server did not confirm success.
 */
export async function syncOfflineQueue<TPayload>(
  userId: string,
  createOnServer: (payload: TPayload) => Promise<unknown>,
): Promise<{ synced: number; failed: number; remaining: number }> {
  if (!userId) {
    throw new Error("A user ID is required to sync offline records.");
  }

  let queue = readQueue<TPayload>(userId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      synced: 0,
      failed: 0,
      remaining: queue.filter((item) => item.status !== "Synced").length,
    };
  }

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.status === "Synced") continue;

    try {
      await createOnServer(item.payload);

      const now = new Date().toISOString();

      queue = queue.map((current) =>
        current.localId === item.localId
          ? {
              ...current,
              status: "Synced",
              updatedAt: now,
              syncedAt: now,
              lastError: undefined,
            }
          : current,
      );

      writeQueue(userId, queue);
      synced += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Server sync failed.";

      queue = queue.map((current) =>
        current.localId === item.localId
          ? {
              ...current,
              status: "Failed",
              updatedAt: new Date().toISOString(),
              lastError: message,
            }
          : current,
      );

      writeQueue(userId, queue);
      failed += 1;
    }
  }

  return {
    synced,
    failed,
    remaining: queue.filter((item) => item.status !== "Synced").length,
  };
}

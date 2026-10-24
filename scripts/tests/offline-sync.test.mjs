import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getOfflineQueue,
  queueOfflineRecord,
  syncOfflineQueue,
} from "../../artifacts/sushruth/src/lib/offline-sync.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
let storage;

function setupBrowser({ online = true } = {}) {
  storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: online },
  });
}

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalThis.navigator;
});

test("queue persists across reads and stays isolated by user", () => {
  setupBrowser();
  queueOfflineRecord("user-a", { note: "synthetic record A" });

  assert.equal(getOfflineQueue("user-a").length, 1);
  assert.equal(getOfflineQueue("user-a")[0].status, "Pending");
  assert.deepEqual(getOfflineQueue("user-b"), []);
});

test("successful server confirmation marks synced and prevents another retry", async () => {
  setupBrowser();
  queueOfflineRecord("user-a", { note: "synthetic record" });
  let calls = 0;

  const result = await syncOfflineQueue("user-a", async () => {
    calls += 1;
    return { id: 1 };
  });

  assert.deepEqual(result, { synced: 1, failed: 0, remaining: 0 });
  assert.equal(getOfflineQueue("user-a")[0].status, "Synced");
  assert.equal(getOfflineQueue("user-a")[0].payload, undefined);
  await syncOfflineQueue("user-a", async () => { calls += 1; });
  assert.equal(calls, 1);
});

test("failed request remains retryable and is marked synced only after a later success", async () => {
  setupBrowser();
  queueOfflineRecord("user-a", { note: "synthetic record" });
  let calls = 0;
  const submittedPayloads = [];

  const failed = await syncOfflineQueue("user-a", async (payload) => {
    calls += 1;
    submittedPayloads.push(payload);
    throw new Error("temporary network failure");
  });
  assert.deepEqual(failed, { synced: 0, failed: 1, remaining: 1 });
  assert.equal(getOfflineQueue("user-a")[0].status, "Failed");
  assert.equal(getOfflineQueue("user-a")[0].payload.note, "synthetic record");

  const retried = await syncOfflineQueue("user-a", async (payload) => {
    calls += 1;
    submittedPayloads.push(payload);
    return { id: 1 };
  });
  assert.deepEqual(retried, { synced: 1, failed: 0, remaining: 0 });
  assert.equal(getOfflineQueue("user-a")[0].status, "Synced");
  assert.equal(calls, 2);
  assert.deepEqual(submittedPayloads, [
    { note: "synthetic record" },
    { note: "synthetic record" },
  ]);
});

test("offline sync does not send or change a pending record", async () => {
  setupBrowser({ online: false });
  queueOfflineRecord("user-a", { note: "synthetic record" });
  let calls = 0;

  const result = await syncOfflineQueue("user-a", async () => { calls += 1; });

  assert.deepEqual(result, { synced: 0, failed: 0, remaining: 1 });
  assert.equal(calls, 0);
  assert.equal(getOfflineQueue("user-a")[0].status, "Pending");
});

test("concurrent retries for one user do not submit the same item twice", async () => {
  setupBrowser();
  queueOfflineRecord("user-a", { note: "synthetic record" });
  let release;
  let calls = 0;
  const first = syncOfflineQueue("user-a", () => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  });
  const second = await syncOfflineQueue("user-a", async () => { calls += 1; });
  assert.deepEqual(second, { synced: 0, failed: 0, remaining: 1 });
  assert.equal(calls, 1);
  release({ id: 1 });
  await first;
  assert.equal(getOfflineQueue("user-a")[0].status, "Synced");
});

test("corrupt queue is reported without overwriting its stored bytes", () => {
  setupBrowser();
  storage.set("sushruth_offline_health_records_v1:user-a", "{bad json");

  assert.throws(() => queueOfflineRecord("user-a", { note: "new record" }), /unreadable/);
  assert.equal(storage.get("sushruth_offline_health_records_v1:user-a"), "{bad json");
});

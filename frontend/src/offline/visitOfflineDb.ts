import type { KutirVisitCreate } from "../api/visits";
import type { Kutir } from "../api/kutirs";
import type { Area, Cluster, District } from "../api/geo";

import type { VisitOfflineDraft } from "./visitDraftTypes";
import { VISIT_DRAFT_TTL_DAYS } from "./visitDraftTypes";

const DB_NAME = "kutirgrs-offline";
const DB_VERSION = 2;
const OUTBOX_STORE = "visit-outbox";
const DRAFTS_STORE = "visit-drafts";
const META_STORE = "meta";

const VISIT_DRAFT_TTL_MS = VISIT_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

export const VISIT_OFFLINE_CHANGED = "visit-offline-changed";

export type VisitLookupCache = {
  kutirs: Kutir[];
  districts: District[];
  areas: Area[];
  clusters: Cluster[];
  cachedAt: string;
};

export type PendingVisitRecord = {
  localId: string;
  payload: KutirVisitCreate;
  photoBlob?: Blob;
  photoName?: string;
  photoType?: string;
  createdAt: string;
  lastError?: string;
};

function notifyChanged() {
  window.dispatchEvent(new Event(VISIT_OFFLINE_CHANGED));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: "localId" });
      }
    };
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function saveVisitLookupCache(cache: Omit<VisitLookupCache, "cachedAt">): Promise<void> {
  const db = await openDb();
  const payload: VisitLookupCache = { ...cache, cachedAt: new Date().toISOString() };
  const tx = db.transaction(META_STORE, "readwrite");
  tx.objectStore(META_STORE).put(payload, "visit-lookups");
  await txDone(tx);
  db.close();
}

export async function loadVisitLookupCache(): Promise<VisitLookupCache | null> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readonly");
  const req = tx.objectStore(META_STORE).get("visit-lookups");
  const value = await new Promise<VisitLookupCache | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as VisitLookupCache | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return value ?? null;
}

export async function enqueuePendingVisit(
  payload: KutirVisitCreate,
  photoFile?: File | null,
): Promise<string> {
  const localId = crypto.randomUUID();
  const record: PendingVisitRecord = {
    localId,
    payload,
    createdAt: new Date().toISOString(),
  };
  if (photoFile) {
    record.photoBlob = photoFile;
    record.photoName = photoFile.name;
    record.photoType = photoFile.type;
  }
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  tx.objectStore(OUTBOX_STORE).put(record);
  await txDone(tx);
  db.close();
  notifyChanged();
  return localId;
}

export async function listPendingVisits(): Promise<PendingVisitRecord[]> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE, "readonly");
  const req = tx.objectStore(OUTBOX_STORE).getAll();
  const rows = await new Promise<PendingVisitRecord[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as PendingVisitRecord[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countPendingVisits(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE, "readonly");
  const req = tx.objectStore(OUTBOX_STORE).count();
  const n = await new Promise<number>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB count failed"));
  });
  await txDone(tx);
  db.close();
  return n;
}

export async function removePendingVisit(localId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  tx.objectStore(OUTBOX_STORE).delete(localId);
  await txDone(tx);
  db.close();
  notifyChanged();
}

export async function saveVisitDraft(kutir_id: number, visit_date: string): Promise<string> {
  const localId = crypto.randomUUID();
  const record: VisitOfflineDraft = {
    localId,
    kutir_id,
    visit_date,
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  tx.objectStore(DRAFTS_STORE).put(record);
  await txDone(tx);
  db.close();
  notifyChanged();
  return localId;
}

export async function listVisitDrafts(): Promise<VisitOfflineDraft[]> {
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  const req = tx.objectStore(DRAFTS_STORE).getAll();
  const rows = await new Promise<VisitOfflineDraft[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as VisitOfflineDraft[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getVisitDraft(localId: string): Promise<VisitOfflineDraft | null> {
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, "readonly");
  const req = tx.objectStore(DRAFTS_STORE).get(localId);
  const value = await new Promise<VisitOfflineDraft | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as VisitOfflineDraft | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return value ?? null;
}

export async function removeVisitDraft(localId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  tx.objectStore(DRAFTS_STORE).delete(localId);
  await txDone(tx);
  db.close();
  notifyChanged();
}

/** Drop drafts older than {@link VISIT_DRAFT_TTL_DAYS}; call on list/load. */
export async function purgeExpiredVisitDrafts(): Promise<number> {
  const cutoff = Date.now() - VISIT_DRAFT_TTL_MS;
  const drafts = await listVisitDrafts();
  const expired = drafts.filter((d) => new Date(d.createdAt).getTime() < cutoff);
  if (expired.length === 0) return 0;
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, "readwrite");
  const store = tx.objectStore(DRAFTS_STORE);
  for (const d of expired) {
    store.delete(d.localId);
  }
  await txDone(tx);
  db.close();
  notifyChanged();
  return expired.length;
}

export async function updatePendingVisitError(localId: string, lastError: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(OUTBOX_STORE, "readwrite");
  const store = tx.objectStore(OUTBOX_STORE);
  const getReq = store.get(localId);
  const record = await new Promise<PendingVisitRecord | undefined>((resolve, reject) => {
    getReq.onsuccess = () => resolve(getReq.result as PendingVisitRecord | undefined);
    getReq.onerror = () => reject(getReq.error ?? new Error("IndexedDB read failed"));
  });
  if (record) {
    store.put({ ...record, lastError });
  }
  await txDone(tx);
  db.close();
}

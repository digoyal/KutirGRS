import type { KutirVisitCreate } from "../api/visits";
import type { VisitPhotoLocation } from "../utils/visitPhotoGeolocation";

import type { VisitOfflineDraft } from "./visitDraftTypes";
import { VISIT_DRAFT_TTL_DAYS } from "./visitDraftTypes";

import { openDb, txDone, VISIT_DRAFTS_STORE, VISIT_OUTBOX_STORE } from "./offlineDbCore";
import { loadGeoKutirLookupCache, saveGeoKutirLookupCache, type GeoKutirLookupCache } from "./geoLookupCache";

const OUTBOX_STORE = VISIT_OUTBOX_STORE;
const DRAFTS_STORE = VISIT_DRAFTS_STORE;

const VISIT_DRAFT_TTL_MS = VISIT_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

export const VISIT_OFFLINE_CHANGED = "visit-offline-changed";

export type PendingVisitRecord = {
  localId: string;
  payload: KutirVisitCreate;
  photoBlob?: Blob;
  photoName?: string;
  photoType?: string;
  photoLatitude?: number;
  photoLongitude?: number;
  photoAccuracyM?: number | null;
  createdAt: string;
  lastError?: string;
};

function notifyChanged() {
  window.dispatchEvent(new Event(VISIT_OFFLINE_CHANGED));
}

export type VisitLookupCache = GeoKutirLookupCache;

export async function saveVisitLookupCache(cache: Omit<VisitLookupCache, "cachedAt">): Promise<void> {
  await saveGeoKutirLookupCache(cache);
}

export async function loadVisitLookupCache(): Promise<VisitLookupCache | null> {
  return loadGeoKutirLookupCache();
}

export async function enqueuePendingVisit(
  payload: KutirVisitCreate,
  photoFile?: File | null,
  photoLocation?: VisitPhotoLocation | null,
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
    if (photoLocation) {
      record.photoLatitude = photoLocation.latitude;
      record.photoLongitude = photoLocation.longitude;
      record.photoAccuracyM = photoLocation.accuracyM;
    }
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

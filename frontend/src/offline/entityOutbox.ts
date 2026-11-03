import { openDb, txDone } from "./offlineDbCore";

export const DRAFT_TTL_DAYS = 7;
const DRAFT_TTL_MS = DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

export type OutboxRecord<TPayload> = {
  localId: string;
  payload: TPayload;
  createdAt: string;
  lastError?: string;
};

export type DraftRecord = {
  localId: string;
  createdAt: string;
};

export function createOutboxApi<TPayload>(
  outboxStore: string,
  draftsStore: string,
  changedEvent: string,
) {
  function notifyChanged() {
    window.dispatchEvent(new Event(changedEvent));
  }

  async function enqueuePending(payload: TPayload): Promise<string> {
    const localId = crypto.randomUUID();
    const record: OutboxRecord<TPayload> = {
      localId,
      payload,
      createdAt: new Date().toISOString(),
    };
    const db = await openDb();
    const tx = db.transaction(outboxStore, "readwrite");
    tx.objectStore(outboxStore).put(record);
    await txDone(tx);
    db.close();
    notifyChanged();
    return localId;
  }

  async function listPending(): Promise<OutboxRecord<TPayload>[]> {
    const db = await openDb();
    const tx = db.transaction(outboxStore, "readonly");
    const req = tx.objectStore(outboxStore).getAll();
    const rows = await new Promise<OutboxRecord<TPayload>[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as OutboxRecord<TPayload>[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    await txDone(tx);
    db.close();
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async function countPending(): Promise<number> {
    const db = await openDb();
    const tx = db.transaction(outboxStore, "readonly");
    const req = tx.objectStore(outboxStore).count();
    const n = await new Promise<number>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB count failed"));
    });
    await txDone(tx);
    db.close();
    return n;
  }

  async function removePending(localId: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(outboxStore, "readwrite");
    tx.objectStore(outboxStore).delete(localId);
    await txDone(tx);
    db.close();
    notifyChanged();
  }

  async function updatePendingError(localId: string, lastError: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(outboxStore, "readwrite");
    const store = tx.objectStore(outboxStore);
    const getReq = store.get(localId);
    const record = await new Promise<OutboxRecord<TPayload> | undefined>((resolve, reject) => {
      getReq.onsuccess = () => resolve(getReq.result as OutboxRecord<TPayload> | undefined);
      getReq.onerror = () => reject(getReq.error ?? new Error("IndexedDB read failed"));
    });
    if (record) {
      store.put({ ...record, lastError });
    }
    await txDone(tx);
    db.close();
  }

  async function saveDraft<T extends DraftRecord>(draft: T): Promise<string> {
    const db = await openDb();
    const tx = db.transaction(draftsStore, "readwrite");
    tx.objectStore(draftsStore).put(draft);
    await txDone(tx);
    db.close();
    notifyChanged();
    return draft.localId;
  }

  async function listDrafts<T extends DraftRecord>(): Promise<T[]> {
    const db = await openDb();
    const tx = db.transaction(draftsStore, "readonly");
    const req = tx.objectStore(draftsStore).getAll();
    const rows = await new Promise<T[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    await txDone(tx);
    db.close();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async function getDraft<T extends DraftRecord>(localId: string): Promise<T | null> {
    const db = await openDb();
    const tx = db.transaction(draftsStore, "readonly");
    const req = tx.objectStore(draftsStore).get(localId);
    const value = await new Promise<T | undefined>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
    await txDone(tx);
    db.close();
    return value ?? null;
  }

  async function removeDraft(localId: string): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(draftsStore, "readwrite");
    tx.objectStore(draftsStore).delete(localId);
    await txDone(tx);
    db.close();
    notifyChanged();
  }

  async function purgeExpiredDrafts(): Promise<number> {
    const cutoff = Date.now() - DRAFT_TTL_MS;
    const drafts = await listDrafts<DraftRecord>();
    const expired = drafts.filter((d) => new Date(d.createdAt).getTime() < cutoff);
    if (expired.length === 0) return 0;
    const db = await openDb();
    const tx = db.transaction(draftsStore, "readwrite");
    const store = tx.objectStore(draftsStore);
    for (const d of expired) {
      store.delete(d.localId);
    }
    await txDone(tx);
    db.close();
    notifyChanged();
    return expired.length;
  }

  return {
    enqueuePending,
    listPending,
    countPending,
    removePending,
    updatePendingError,
    saveDraft,
    listDrafts,
    getDraft,
    removeDraft,
    purgeExpiredDrafts,
    changedEvent,
  };
}

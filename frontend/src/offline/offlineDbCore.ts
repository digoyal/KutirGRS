export const DB_NAME = "kutirgrs-offline";
export const DB_VERSION = 3;

export const META_STORE = "meta";

export const VISIT_OUTBOX_STORE = "visit-outbox";
export const VISIT_DRAFTS_STORE = "visit-drafts";

const ALL_STORES = [
  VISIT_OUTBOX_STORE,
  VISIT_DRAFTS_STORE,
  META_STORE,
];

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ALL_STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "localId" });
        }
      }
    };
  });
}

export async function metaGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readonly");
  const req = tx.objectStore(META_STORE).get(key);
  const value = await new Promise<T | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return value ?? null;
}

export async function metaPut<T extends object>(key: string, payload: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, "readwrite");
  tx.objectStore(META_STORE).put(payload, key);
  await txDone(tx);
  db.close();
}

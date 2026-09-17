import { useState, useCallback, useEffect } from "react";
import { fetchFieldConfig, saveFieldConfig } from "../api/settings";

export interface FieldMeta {
  key: string;
  label: string;
  hideable: boolean;
  defaultVisible: boolean;
}

export interface FieldConfigEntry {
  key: string;
  visible: boolean;
  position: number;
}

const lsKey = (table: string) => `grs_field_config_${table}`;
const CONFIG_UPDATED = "grs:fieldconfig:updated";

function readCache(table: string): Record<string, FieldConfigEntry> {
  try {
    const raw = localStorage.getItem(lsKey(table));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function writeCache(table: string, map: Record<string, FieldConfigEntry>) {
  try { localStorage.setItem(lsKey(table), JSON.stringify(map)); } catch {}
}

function entriesToMap(entries: FieldConfigEntry[]): Record<string, FieldConfigEntry> {
  return Object.fromEntries(entries.map(e => [e.key, e]));
}

export function useFieldConfig(tableName: string, allFields: FieldMeta[]) {
  // Start from localStorage cache so the UI renders immediately with the right columns
  const [saved, setSaved] = useState<Record<string, FieldConfigEntry>>(() => readCache(tableName));
  const [apiSynced, setApiSynced] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Re-read localStorage immediately so any synchronous writes (writeCache in saveConfig)
    // show up instantly before the API round-trip completes.
    const cached = readCache(tableName);
    const hasCache = Object.keys(cached).length > 0;
    if (hasCache) setSaved(cached);
    setApiSynced(false);
    fetchFieldConfig(tableName).then(entries => {
      if (cancelled) return;
      if (entries) {
        const map = entriesToMap(entries);
        // Only let the API response win if localStorage has nothing.
        // When localStorage already has data (set by saveConfig just before navigation),
        // the API response may be racing the DB commit and could return stale data —
        // so we trust localStorage and only update the cache silently.
        if (!hasCache) {
          setSaved(map);
          writeCache(tableName, map);
        }
        // If hasCache, localStorage is already the freshest data; leave saved alone.
      }
      setApiSynced(true);
    }).catch(() => { if (!cancelled) setApiSynced(true); });
    return () => { cancelled = true; };
  }, [tableName]);

  const isVisible = useCallback(
    (key: string) => {
      const meta = allFields.find(f => f.key === key);
      if (!meta || !meta.hideable) return true;
      return saved[key]?.visible ?? meta.defaultVisible;
    },
    [saved, allFields]
  );

  const orderedMetas = [...allFields].sort((a, b) => {
    const pa = saved[a.key]?.position ?? allFields.indexOf(a);
    const pb = saved[b.key]?.position ?? allFields.indexOf(b);
    return pa - pb;
  });

  const saveConfig = useCallback(
    async (entries: FieldConfigEntry[]) => {
      const map = entriesToMap(entries);
      setSaved(map);                     // optimistic update
      writeCache(tableName, map);        // cache for instant next load
      await saveFieldConfig(tableName, entries);  // persist to DB
      // Notify other mounted instances of this hook to pick up the new config
      window.dispatchEvent(new CustomEvent(CONFIG_UPDATED, { detail: { tableName } }));
    },
    [tableName]
  );

  // Listen for saves from other hook instances (e.g. FieldConfigPage -> StudentProgressPage)
  useEffect(() => {
    function onConfigUpdated(e: Event) {
      const detail = (e as CustomEvent<{ tableName: string }>).detail;
      if (detail.tableName !== tableName) return;
      const map = readCache(tableName);
      setSaved(map);
    }
    window.addEventListener(CONFIG_UPDATED, onConfigUpdated);
    return () => window.removeEventListener(CONFIG_UPDATED, onConfigUpdated);
  }, [tableName]);

  return { isVisible, orderedMetas, saved, saveConfig, apiSynced };
}

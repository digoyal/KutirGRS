import api from "./client";
import type { FieldConfigEntry } from "../hooks/useFieldConfig";

const settingKey = (table: string) => `field_config_${table}`;

export async function fetchFieldConfig(table: string): Promise<FieldConfigEntry[] | null> {
  try {
    // Cache-buster prevents browser from returning a stale GET after a save
    const res = await api.get(`/settings/${settingKey(table)}`, {
      params: { _: Date.now() },
    });
    return res.data?.value ?? null;
  } catch {
    return null;
  }
}

export async function saveFieldConfig(table: string, entries: FieldConfigEntry[]): Promise<void> {
  await api.put(`/settings/${settingKey(table)}`, entries);
}

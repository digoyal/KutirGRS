import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldConfig, type FieldMeta, type FieldConfigEntry } from "../hooks/useFieldConfig";
import { PROGRESS_FIELDS } from "../constants/progressFields";
import { ADMISSIONS_FIELDS } from "../constants/admissionsFields";
import { EXAM_CENTERS_FIELDS } from "../constants/examCentersFields";
import { KUTIRS_FIELDS } from "../constants/kutirsFields";
import { SCHOOLS_FIELDS } from "../constants/schoolsFields";
import { STUDENTS_FIELDS } from "../constants/studentsFields";
import { VISITS_FIELDS } from "../constants/visitsFields";
import { USERS_FIELDS } from "../constants/usersFields";

const TABLE_REGISTRY: Record<string, { label: string; fields: FieldMeta[]; backPath: string }> = {
  students:    { label: "Students",     fields: STUDENTS_FIELDS,     backPath: "/students" },
  kutirs:      { label: "Kutirs",       fields: KUTIRS_FIELDS,       backPath: "/kutirs" },
  admissions:  { label: "Admissions",   fields: ADMISSIONS_FIELDS,   backPath: "/admissions" },
  progress:    { label: "Progress",     fields: PROGRESS_FIELDS,     backPath: "/progress" },
  visits:      { label: "Visits",       fields: VISITS_FIELDS,       backPath: "/visits/detail" },
  schools:     { label: "Schools",      fields: SCHOOLS_FIELDS,      backPath: "/schools" },
  examcenters: { label: "Exam Centers", fields: EXAM_CENTERS_FIELDS, backPath: "/exam-centers" },
  users:       { label: "Users",        fields: USERS_FIELDS,        backPath: "/users" },
};

export default function FieldConfigPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const initialTable = params.get("table") ?? "progress";
  const [activeTable, setActiveTable] = useState(initialTable);
  const tableInfo = TABLE_REGISTRY[activeTable] ?? TABLE_REGISTRY["progress"];
  const backPath = tableInfo.backPath;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => navigate(backPath)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px 0", fontSize: "0.875rem" }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Column Settings</h2>
      </div>

      {Object.keys(TABLE_REGISTRY).length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {Object.entries(TABLE_REGISTRY).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveTable(key)}
              style={{
                padding: "6px 16px", borderRadius: 6, border: "1px solid var(--border)",
                background: activeTable === key ? "var(--badge-purple-fg)" : "var(--bg-input)",
                color: activeTable === key ? "white" : "var(--text-secondary)",
                cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <FieldConfigEditor
        key={activeTable}
        tableName={activeTable}
        allFields={tableInfo.fields}
        tableLabel={tableInfo.label}
        backPath={backPath}
      />
    </div>
  );
}

function FieldConfigEditor({
  tableName, allFields, tableLabel, backPath,
}: {
  tableName: string;
  allFields: FieldMeta[];
  tableLabel: string;
  backPath: string;
}) {
  const { orderedMetas, saved, saveConfig, apiSynced } = useFieldConfig(tableName, allFields);

  // null = still loading from API; non-null = ready to edit
  const [localOrder, setLocalOrder] = useState<FieldMeta[] | null>(null);
  const [localVisible, setLocalVisible] = useState<Record<string, boolean>>({});
  const [didSave, setDidSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  // Initialize from API data exactly once when it arrives.
  // orderedMetas is included in deps so we capture the post-setSaved value.
  const apiInitialized = useRef(false);
  useEffect(() => {
    if (!apiSynced) return;
    if (apiInitialized.current) return;
    apiInitialized.current = true;
    setLocalOrder([...orderedMetas]);
    setLocalVisible(Object.fromEntries(orderedMetas.map(m => [
      m.key,
      m.hideable ? (saved[m.key]?.visible ?? m.defaultVisible) : true,
    ])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiSynced, orderedMetas]);

  function handleDragStart(i: number) { dragIdx.current = i; }
  function handleDragEnter(i: number) { dragOverIdx.current = i; }
  function handleDragEnd() {
    const from = dragIdx.current;
    const to = dragOverIdx.current;
    if (from == null || to == null || from === to) return;
    const next = [...localOrder!];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setLocalOrder(next);
    dragIdx.current = null;
    dragOverIdx.current = null;
    setDidSave(false);
  }

  function toggleVisible(key: string) {
    setLocalVisible(v => ({ ...v, [key]: !v[key] }));
    setDidSave(false);
  }

  async function apply() {
    setSaving(true);
    const entries: FieldConfigEntry[] = localOrder!.map((m, i) => ({
      key: m.key,
      visible: m.hideable ? (localVisible[m.key] ?? m.defaultVisible) : true,
      position: i,
    }));
    await saveConfig(entries);
    setSaving(false);
    setDidSave(true);
    window.location.assign(backPath + "?_=" + Date.now());
  }

  function reset() {
    setLocalOrder([...allFields]);
    setLocalVisible(Object.fromEntries(allFields.map(m => [m.key, m.defaultVisible])));
    setDidSave(false);
  }

  if (localOrder === null) {
    return <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Loading…</div>;
  }

  return (
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: 20 }}>
        Configure which columns appear in the <strong>{tableLabel}</strong> and in what order.
        Drag rows to reorder. Changes apply instantly after clicking Apply.
      </p>

      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "10px 16px", background: "var(--badge-purple-bg)", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "32px 1fr 100px", gap: 8, alignItems: "center" }}>
          <span />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--badge-purple-fg)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Column</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--badge-purple-fg)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Visible</span>
        </div>

        {localOrder.map((m, i) => {
          const isOn = m.hideable ? (localVisible[m.key] ?? m.defaultVisible) : true;
          return (
            <div
              key={m.key}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              style={{
                display: "grid", gridTemplateColumns: "32px 1fr 100px", gap: 8, alignItems: "center",
                padding: "12px 16px",
                borderBottom: i < localOrder.length - 1 ? "1px solid var(--border)" : "none",
                background: "var(--bg-card)",
                cursor: "grab",
                opacity: isOn ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}
            >
              <span style={{ color: "var(--text-secondary)", fontSize: "1.1rem", userSelect: "none" }}>≡</span>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{m.label}</div>
                {!m.hideable && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>Always visible</div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                {m.hideable ? (
                  <button
                    onClick={() => toggleVisible(m.key)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                      background: isOn ? "var(--badge-purple-fg)" : "var(--border)",
                      position: "relative", transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3,
                      left: isOn ? 23 : 3,
                      width: 18, height: 18, borderRadius: "50%", background: "white",
                      transition: "left 0.2s", display: "block",
                    }} />
                  </button>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
        <button
          onClick={apply}
          disabled={saving}
          style={{ background: "var(--badge-purple-fg)", color: "white", border: "none", borderRadius: 6, padding: "8px 20px", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Apply"}
        </button>
        <button
          onClick={reset}
          style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: "0.875rem" }}
        >
          Reset to Defaults
        </button>
        {didSave && (
          <span style={{ color: "var(--status-success-fg)", fontSize: "0.85rem", fontWeight: 600 }}>✓ Saved</span>
        )}
      </div>
      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 10 }}>
        Settings are saved to the server and apply for all users.
      </p>
    </div>
  );
}

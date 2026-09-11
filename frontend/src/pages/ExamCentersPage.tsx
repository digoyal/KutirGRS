import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listExamCenters, listDistricts } from "../api/geo";
import type { ExamCenter } from "../api/geo";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { grs } from "../styles/grs";
import { GrsTable } from "../components/GrsTable";
import type { Col } from "../components/GrsTable";

interface ExamCenterPayload {
  name: string; district_id: number;
  street?: string; city?: string; state?: string; pincode?: string;
}

async function createExamCenter(data: ExamCenterPayload): Promise<ExamCenter> {
  return (await api.post("/geo/exam-centers", data)).data;
}
async function updateExamCenter(id: number, data: Partial<ExamCenterPayload>): Promise<ExamCenter> {
  return (await api.put(`/geo/exam-centers/${id}`, data)).data;
}
async function deleteExamCenter(id: number): Promise<void> {
  await api.delete(`/geo/exam-centers/${id}`);
}

type FormState = { name: string; district_id: number | ""; street: string; city: string; state: string; pincode: string; };

// Hoisted outside Modal to prevent remount-on-keystroke focus loss
function FieldInput({ label, k, placeholder, form, set }: {
  label: string; k: keyof FormState; placeholder?: string;
  form: FormState; set: (k: keyof FormState, v: string | number) => void;
}) {
  return (
    <div>
      <label style={grs.fieldLabel}>{label}</label>
      <input value={form[k] as string} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} style={grs.input} />
    </div>
  );
}

function Modal({ title, initial, districts, onClose, onSave }: {
  title: string; initial: FormState;
  districts: { id: number; name: string }[];
  onClose: () => void; onSave: (data: ExamCenterPayload) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() !== "" && form.district_id !== "";

  return (
    <div style={grs.overlay}>
      <div style={grs.modal}>
        <h3 style={grs.modalTitle}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldInput label="Name *" k="name" form={form} set={set} />
          <FieldInput label="Street" k="street" form={form} set={set} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldInput label="City" k="city" form={form} set={set} />
            <div>
              <label style={grs.fieldLabel}>District *</label>
              <select value={form.district_id}
                onChange={e => set("district_id", Number(e.target.value))}
                style={grs.select}>
                <option value="">-- select --</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldInput label="State" k="state" form={form} set={set} />
            <FieldInput label="Pincode" k="pincode" placeholder="e.g. 473001" form={form} set={set} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={grs.btnSecondary}>Cancel</button>
          <button disabled={!valid}
            onClick={() => onSave({
              name: form.name.trim(), district_id: Number(form.district_id),
              street: form.street || undefined, city: form.city || undefined,
              state: form.state || undefined, pincode: form.pincode || undefined,
            })}
            style={{ ...grs.btnPrimary, opacity: valid ? 1 : 0.5 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

const BLANK: FormState = { name: "", district_id: "", street: "", city: "", state: "Madhya Pradesh", pincode: "" };

export default function ExamCentersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.title === "Admin";

  const [filterDistrict, setFilterDistrict] = useState<number | "">("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<ExamCenter | null>(null);

  const { data: centers = [], isLoading } = useQuery({ queryKey: ["exam-centers"], queryFn: () => listExamCenters() });
  const { data: districts = [] } = useQuery({ queryKey: ["all-districts"], queryFn: () => listDistricts() });

  const districtMap = Object.fromEntries(districts.map(d => [d.id, d.name]));

  const addMut = useMutation({
    mutationFn: createExamCenter,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exam-centers"] }); setShowAdd(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExamCenterPayload> }) => updateExamCenter(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exam-centers"] }); setEditItem(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteExamCenter,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-centers"] }),
  });

  // Enrich centers with district name for sorting/export
  const enriched = centers
    .filter(c => filterDistrict === "" || c.district_id === filterDistrict)
    .map(c => ({ ...c, districtName: districtMap[c.district_id ?? 0] ?? "" }));

  function toForm(c: ExamCenter): FormState {
    return { name: c.name, district_id: c.district_id ?? "",
      street: c.street ?? "", city: c.city ?? "",
      state: c.state ?? "Madhya Pradesh", pincode: c.pincode ?? "" };
  }

  const columns: Col<typeof enriched[0]>[] = [
    { key: "name",         label: "Name",     sortable: true },
    { key: "street",       label: "Street",   sortable: true, render: r => r.street || "—" },
    { key: "city",         label: "City",     sortable: true, render: r => r.city || "—" },
    { key: "districtName", label: "District", sortable: true, render: r => r.districtName || "—" },
    { key: "state",        label: "State",    sortable: true, render: r => r.state || "—" },
    { key: "pincode",      label: "Pincode",  sortable: true,
      render: r => r.pincode || "—",
      tdStyle: { fontVariantNumeric: "tabular-nums" } },

  ];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <GrsTable
        title="Exam Centers"
        subtitle="Venues where entrance exams are held"
        columns={columns}
        data={enriched}
        rowKey={r => r.id}
        isLoading={isLoading}
        emptyMessage="No exam centers found."
        actions={isAdmin ? r => ({ onEdit: () => setEditItem(r), onDelete: () => { if (confirm("Delete this exam center?")) deleteMut.mutate(r.id); } }) : undefined}
        searchable
        searchPlaceholder="Search centers…"
        filters={
          <select value={filterDistrict}
            onChange={e => setFilterDistrict(e.target.value === "" ? "" : Number(e.target.value))}
            style={grs.filterSelect}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        }
        exportFilename="exam-centers"
        printTitle="Exam Centers"
        onAdd={isAdmin ? () => setShowAdd(true) : undefined}
        addLabel="+ Add Center"
      />

      {showAdd && (
        <Modal title="Add Exam Center" initial={BLANK} districts={districts}
          onClose={() => setShowAdd(false)} onSave={data => addMut.mutate(data)} />
      )}
      {editItem && (
        <Modal title="Edit Exam Center" initial={toForm(editItem)} districts={districts}
          onClose={() => setEditItem(null)}
          onSave={data => updateMut.mutate({ id: editItem.id, data })} />
      )}
    </div>
  );
}

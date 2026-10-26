/**
 * Shared exam-center form used by ExamCenterAddPage and ExamCenterDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable), edit (editable), view (read-only).
 */
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ViewField, ViewSection, viewStyles } from "@parivaar/ui";
import { listDistricts } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { grs } from "../styles/grs";

const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

export interface ExamCenterFormState {
  name: string;
  district_id: number | null;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export function emptyExamCenterForm(): ExamCenterFormState {
  return {
    name: "",
    district_id: null,
    street: "",
    city: "",
    state: "Madhya Pradesh",
    pincode: "",
  };
}

const sec: React.CSSProperties = viewStyles.section;
const secTitle: React.CSSProperties = viewStyles.sectionTitle;

interface ExamCenterFormProps {
  form: ExamCenterFormState;
  setForm: React.Dispatch<React.SetStateAction<ExamCenterFormState>>;
  mode: "add" | "edit" | "view";
  /** District display name for view mode. */
  districtName?: string | null;
}

export function ExamCenterForm({
  form,
  setForm,
  mode,
  districtName,
}: ExamCenterFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);

  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
  });

  const scopedDistricts =
    unscoped || !user
      ? allDistricts
      : allDistricts.filter((d) => user.district_ids.includes(d.id));

  const districtOptions = isAdd ? scopedDistricts : allDistricts;

  useEffect(() => {
    if (!isAdd) return;
    if (scopedDistricts.length === 1 && !form.district_id) {
      setForm((f) => ({ ...f, district_id: scopedDistricts[0].id }));
    }
  }, [isAdd, scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function field(label: string, viewValue: React.ReactNode, editContent: React.ReactNode) {
    if (readOnly) {
      return <ViewField label={label}>{viewValue}</ViewField>;
    }
    return (
      <div>
        <label style={grs.fieldLabel}>{label}</label>
        {editContent}
      </div>
    );
  }

  function wrapSection(title: string, children: React.ReactNode) {
    if (readOnly) {
      return <ViewSection title={title}>{children}</ViewSection>;
    }
    return (
      <section style={sec}>
        <div style={secTitle}>{title}</div>
        {children}
      </section>
    );
  }

  return (
    <div>
      {wrapSection(
        "Details",
        field(
          "Name *",
          form.name,
          <input
            style={grs.input}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Exam center name"
          />,
        ),
      )}

      {wrapSection(
        "Location",
        <>
          <div style={{ marginBottom: 8 }}>
            {field(
              "Street",
              form.street || null,
              <input
                style={grs.input}
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              />,
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {field(
              "City",
              form.city || null,
              <input
                style={grs.input}
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />,
            )}
            {field(
              "District *",
              districtName ?? allDistricts.find((d) => d.id === form.district_id)?.name,
              <select
                style={grs.select}
                value={form.district_id ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, district_id: Number(e.target.value) || null }))
                }
              >
                <option value="">— select —</option>
                {districtOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>,
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {field(
              "State",
              form.state || null,
              <select
                style={grs.select}
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              >
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>,
            )}
            {field(
              "Pincode",
              form.pincode || null,
              <input
                style={grs.input}
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                maxLength={10}
              />,
            )}
          </div>
        </>,
      )}
    </div>
  );
}

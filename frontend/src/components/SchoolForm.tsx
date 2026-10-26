/**
 * Shared school form used by SchoolAddPage and SchoolDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable), edit (editable), view (read-only).
 */
import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ViewField, ViewSection, viewStyles } from "@parivaar/ui";
import { type SchoolCreate } from "../api/schools";
import { listDistricts } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { grs } from "../styles/grs";

const SCHOOL_TYPES = ["EMRS", "JNV", "KSP", "MRS", "GNV", "KGBV", "SportsBoys", "SportsGirls", "Other"];
const STATES = ["Madhya Pradesh", "Jharkhand", "Chhattisgarh"];

export type SchoolFormState = SchoolCreate;

export function emptySchoolForm(): SchoolFormState {
  return {
    name: "",
    school_type: "EMRS",
    state: "Madhya Pradesh",
    city: null,
    street: null,
    district_id: null,
    pincode: null,
  };
}

const sec: React.CSSProperties = viewStyles.section;
const secTitle: React.CSSProperties = viewStyles.sectionTitle;

interface SchoolFormProps {
  form: SchoolFormState;
  setForm: React.Dispatch<React.SetStateAction<SchoolFormState>>;
  mode: "add" | "edit" | "view";
  /** District display name for view mode. */
  districtName?: string | null;
}

export function SchoolForm({ form, setForm, mode, districtName }: SchoolFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();

  const { data: districts = [] } = useQuery({
    queryKey: ["all-districts"],
    queryFn: () => listDistricts(),
  });

  const scopedDistricts = useMemo(() => {
    if (!user || hasGlobalDataScope(user.title)) return districts;
    return user.district_ids?.length > 0
      ? districts.filter((d) => user.district_ids.includes(d.id))
      : districts;
  }, [districts, user]);

  const districtOptions = isAdd ? scopedDistricts : districts;

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
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
            {field(
              "Type",
              form.school_type,
              <select
                style={grs.select}
                value={form.school_type}
                onChange={(e) => setForm((f) => ({ ...f, school_type: e.target.value }))}
              >
                {SCHOOL_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>,
            )}
            {field(
              "Name *",
              form.name,
              <input
                style={grs.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="School name"
              />,
            )}
          </div>
          {field(
            "Street / Address",
            form.street,
            <input
              style={grs.input}
              value={form.street ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value || null }))}
            />,
          )}
        </>,
      )}

      {wrapSection(
        "Location",
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {field(
              "City / Block",
              form.city,
              <input
                style={grs.input}
                value={form.city ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value || null }))}
              />,
            )}
            {field(
              "District",
              districtName ?? districts.find((d) => d.id === form.district_id)?.name,
              <select
                style={grs.select}
                value={form.district_id ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, district_id: Number(e.target.value) || null }))
                }
              >
                <option value="">— none —</option>
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
              form.state,
              <select
                style={grs.select}
                value={form.state ?? "Madhya Pradesh"}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              >
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>,
            )}
            {field(
              "Pincode",
              form.pincode,
              <input
                style={grs.input}
                value={form.pincode ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value || null }))}
                maxLength={10}
              />,
            )}
          </div>
        </>,
      )}
    </div>
  );
}

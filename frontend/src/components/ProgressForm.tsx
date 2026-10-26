/**
 * Shared progress form used by ProgressAddPage and ProgressDetailPage.
 * Caller owns form state; this component is presentational + interactive.
 * Modes: add (empty/editable + student search), edit (editable), view (read-only).
 */
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import {
  listExams,
  type StudentExam,
  type ProgressStatus,
} from "../api/admissions";
import { listSchools, type School } from "../api/schools";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters } from "../api/geo";
import { useAuth } from "../context/AuthContext";
import { hasGlobalDataScope } from "../constants/roles";
import { ViewField, viewStyles } from "@parivaar/ui";
import {
  STATUS_LABELS,
  STATUS_OPTIONS,
  STATUS_BADGES,
} from "../constants/progressStatus";
import { formatAcademicYear } from "../utils/academicYear";
import { studentLabel } from "../utils/studentLabel";

const CURRENT_YEAR = new Date().getFullYear();

export interface ProgressFormState {
  student_id: number;
  school_id: number;
  academic_year: number;
  class_in_year: number | null;
  status: ProgressStatus;
  transfer_school: string | null;
  exit_reason: string | null;
  previous_year_percentage: number | null;
  remarks: string | null;
}

export function emptyProgressForm(year = CURRENT_YEAR): ProgressFormState {
  return {
    student_id: 0,
    school_id: 0,
    academic_year: year,
    class_in_year: null,
    status: "enrolled",
    transfer_school: null,
    exit_reason: null,
    previous_year_percentage: null,
    remarks: null,
  };
}

interface StudentMin {
  id: number;
  first_name: string;
  last_name: string;
  kutir_id: number | null;
}

interface ProgressFormProps {
  form: ProgressFormState;
  setForm: React.Dispatch<React.SetStateAction<ProgressFormState>>;
  mode: "add" | "edit" | "view";
  /** Display name for edit/view (student cannot be changed). */
  studentName?: string;
  /** School display name for view mode. */
  schoolName?: string;
}

export function ProgressForm({
  form,
  setForm,
  mode,
  studentName,
  schoolName,
}: ProgressFormProps) {
  const readOnly = mode === "view";
  const isAdd = mode === "add";
  const { user } = useAuth();
  const unscoped = hasGlobalDataScope(user?.title);

  const [search, setSearch] = useState("");
  const [modalDistrict, setModalDistrict] = useState<number | "">("");
  const [modalCluster, setModalCluster] = useState<number | "">("");

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
  });

  const { data: allKutirs = [] } = useQuery({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
    enabled: isAdd,
  });
  const { data: allDistricts = [] } = useQuery({
    queryKey: ["districts", { parivaar_presence: true }],
    queryFn: () => listDistricts(undefined, { parivaar_presence: true }),
    enabled: isAdd,
  });
  const { data: allAreas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
    enabled: isAdd,
  });
  const { data: allClusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
    enabled: isAdd,
  });
  const { data: allExams = [] } = useQuery<StudentExam[]>({
    queryKey: ["all-exams-admitted"],
    queryFn: () => listExams({ admitted: true }),
    enabled: isAdd,
  });

  const scopedDistricts =
    unscoped || !user
      ? allDistricts
      : allDistricts.filter((d) => user.district_ids.includes(d.id));
  const scopedClusters =
    unscoped || !user
      ? allClusters
      : user.cluster_ids.length > 0
        ? allClusters.filter((c) => user.cluster_ids.includes(c.id))
        : allClusters;
  const scopedKutirs =
    unscoped || !user
      ? allKutirs
      : user.kutir_ids.length > 0
        ? allKutirs.filter((k) => user.kutir_ids.includes(k.id))
        : allKutirs;

  const kutirMap = useMemo(
    () => new Map(scopedKutirs.map((k: { id: number; cluster_id: number }) => [k.id, k.cluster_id])),
    [scopedKutirs],
  );
  const clusterAreaMap = useMemo(
    () => new Map(allClusters.map((c: { id: number; area_id: number }) => [c.id, c.area_id])),
    [allClusters],
  );
  const areaDistrictMap = useMemo(
    () => new Map(allAreas.map((a: { id: number; district_id: number }) => [a.id, a.district_id])),
    [allAreas],
  );

  const modalClusters = useMemo(
    () =>
      scopedClusters.filter(
        (c: { id: number }) =>
          modalDistrict === "" ||
          areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict,
      ),
    [scopedClusters, modalDistrict, areaDistrictMap, clusterAreaMap],
  );

  const admittedSchoolMap = useMemo<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const e of allExams) {
      if (e.admitted && e.admitted_school_id && !(e.student_id in m)) {
        m[e.student_id] = e.admitted_school_id;
      }
    }
    return m;
  }, [allExams]);

  useEffect(() => {
    if (!isAdd) return;
    if (scopedDistricts.length === 1 && modalDistrict === "") {
      setModalDistrict(scopedDistricts[0].id);
    }
  }, [isAdd, scopedDistricts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdd || modalDistrict === "") return;
    const cls = scopedClusters.filter(
      (c: { id: number }) =>
        areaDistrictMap.get(clusterAreaMap.get(c.id) ?? -1) === modalDistrict,
    );
    if (cls.length === 1 && modalCluster === "") setModalCluster(cls[0].id);
  }, [isAdd, modalDistrict, scopedClusters.length, allAreas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: rawStudents = [] } = useQuery<StudentMin[]>({
    queryKey: ["students-search", search],
    queryFn: async () =>
      (await api.get("/students", { params: { search, name_only: true, limit: 100 } })).data,
    enabled: isAdd && search.trim().length >= 1,
  });

  const students = useMemo(() => {
    if (modalCluster !== "") {
      return rawStudents.filter(
        (s) => s.kutir_id != null && kutirMap.get(s.kutir_id!) === modalCluster,
      );
    }
    if (modalDistrict !== "") {
      return rawStudents.filter((s) => {
        if (s.kutir_id == null) return false;
        const cid = kutirMap.get(s.kutir_id);
        if (cid == null) return false;
        const aid = clusterAreaMap.get(cid);
        if (aid == null) return false;
        return areaDistrictMap.get(aid) === modalDistrict;
      });
    }
    return rawStudents.slice(0, 20);
  }, [rawStudents, modalDistrict, modalCluster, kutirMap, clusterAreaMap, areaDistrictMap]);

  function set<K extends keyof ProgressFormState>(key: K, val: ProgressFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const currentStatus = (form.status || "enrolled") as ProgressStatus;
  const badge = STATUS_BADGES[currentStatus] ?? STATUS_BADGES.enrolled;
  const yearLabel = isAdd ? "Year" : "Academic Year";

  return (
    <div>
      {isAdd && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>District</label>
              <select
                style={inp}
                value={modalDistrict}
                onChange={(e) => {
                  setModalDistrict(e.target.value === "" ? "" : Number(e.target.value));
                  setModalCluster("");
                }}
              >
                <option value="">— Select District —</option>
                {scopedDistricts.map((d: { id: number; name: string }) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Cluster</label>
              <select
                style={inp}
                value={modalCluster}
                onChange={(e) =>
                  setModalCluster(e.target.value === "" ? "" : Number(e.target.value))
                }
                disabled={modalDistrict === ""}
              >
                <option value="">— Select Cluster —</option>
                {modalClusters.map((c: { id: number; name: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Student *</label>
            <input
              style={inp}
              placeholder="Type name to search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {students.length > 0 && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderTop: "none",
                  borderRadius: "0 0 6px 6px",
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {students.map((s) => {
                  const label = studentLabel(s);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        set("student_id", s.id);
                        setSearch(label);
                        const school = admittedSchoolMap[s.id];
                        if (school) set("school_id", school);
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        background:
                          form.student_id === s.id ? "var(--badge-blue-bg)" : "var(--bg-card)",
                      }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!isAdd && (
        readOnly ? (
          <div style={{ marginBottom: 14 }}>
            <ViewField label="Student">
              {form.student_id ? (
                <Link
                  to={`/students/${form.student_id}`}
                  style={{
                    color: "var(--badge-purple-fg)",
                    textDecoration: "none",
                    fontWeight: 400,
                  }}
                >
                  {studentName ?? `Student #${form.student_id}`}
                </Link>
              ) : null}
            </ViewField>
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Student</label>
            <div style={{ ...inp, color: "var(--text-secondary)", background: "var(--bg-input)" }}>
              {studentName ?? `Student #${form.student_id}`}
            </div>
          </div>
        )
      )}

      {readOnly ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <ViewField label={yearLabel} style={{ flex: 1 }}>
            {formatAcademicYear(form.academic_year)}
          </ViewField>
          <ViewField label="Class" style={{ flex: 1 }}>
            {form.class_in_year != null ? `Class ${form.class_in_year}` : null}
          </ViewField>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{yearLabel}</label>
            <select
              style={inp}
              value={form.academic_year}
              onChange={(e) => set("academic_year", Number(e.target.value))}
            >
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
                <option key={y} value={y}>
                  {formatAcademicYear(y)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{isAdd ? "Class *" : "Class"}</label>
            <select
              style={inp}
              value={form.class_in_year ?? ""}
              onChange={(e) =>
                set("class_in_year", e.target.value === "" ? null : Number(e.target.value))
              }
            >
              <option value="">— select —</option>
              {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {readOnly ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <ViewField label="School *" style={{ flex: 2 }}>
            {schoolName}
          </ViewField>
          <ViewField label="Marks %" style={{ flex: 1 }}>
            {form.previous_year_percentage != null
              ? `${parseFloat(String(form.previous_year_percentage)).toFixed(1)}%`
              : null}
          </ViewField>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>School *</label>
            <select
              style={inp}
              value={form.school_id || ""}
              onChange={(e) => set("school_id", Number(e.target.value))}
            >
              <option value="">— select —</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.school_type})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Marks %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              style={inp}
              value={form.previous_year_percentage ?? ""}
              onChange={(e) =>
                set(
                  "previous_year_percentage",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        {readOnly ? (
          <ViewField label="Status">
            <span
              style={{
                background: badge.bg,
                color: badge.fg,
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: "0.85rem",
                fontWeight: 400,
              }}
            >
              {badge.prefix}
              {STATUS_LABELS[currentStatus]}
            </span>
            {currentStatus === "transferred" && form.transfer_school && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>
                {form.transfer_school}
              </div>
            )}
            {currentStatus === "dropped_out" && form.exit_reason && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>
                {form.exit_reason}
              </div>
            )}
          </ViewField>
        ) : (
          <>
            <label style={labelStyle}>Status</label>
            <select
              style={inp}
              value={currentStatus}
              onChange={(e) => set("status", e.target.value as ProgressStatus)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {!readOnly && currentStatus === "transferred" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>School Name</label>
          <input
            style={inp}
            placeholder="Name of school transferred to"
            value={form.transfer_school ?? ""}
            onChange={(e) => set("transfer_school", e.target.value || null)}
          />
        </div>
      )}

      {!readOnly && currentStatus === "dropped_out" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Reason</label>
          <input
            style={inp}
            placeholder="Reason for dropping out"
            value={form.exit_reason ?? ""}
            onChange={(e) => set("exit_reason", e.target.value || null)}
          />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        {readOnly ? (
          <ViewField label="Remarks" valueStyle={{ ...viewVal, whiteSpace: "pre-wrap" }}>
            {form.remarks}
          </ViewField>
        ) : (
          <>
            <label style={labelStyle}>Remarks</label>
            <textarea
              style={{ ...inp, resize: "vertical" }}
              rows={2}
              value={form.remarks ?? ""}
              onChange={(e) => set("remarks", e.target.value || null)}
            />
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 3,
};

const inp: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  background: "var(--bg-input)",
  color: "var(--text-primary)",
};

const viewVal: React.CSSProperties = viewStyles.value;

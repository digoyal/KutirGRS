import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudent, updateStudent, type Student } from "../api/students";
import { listKutirs } from "../api/kutirs";
import { listDistricts, listAreas, listClusters, listCategories, listSubCategories } from "../api/geo";
import {
  StudentForm,
  emptyStudentForm,
  studentFormFromDetail,
  type StudentFormState,
} from "../components/StudentForm";
import { grs } from "../styles/grs";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const enteredViaEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(enteredViaEdit);
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [saveError, setSaveError] = useState("");

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(Number(id)),
    enabled: !!id && !isNaN(Number(id)),
  });

  useEffect(() => {
    if (student) setForm(studentFormFromDetail(student));
  }, [student]);

  const { data: kutirs = [] } = useQuery({
    queryKey: ["all-kutirs"],
    queryFn: () => listKutirs(),
  });
  const { data: districts = [] } = useQuery({
    queryKey: ["all-districts"],
    queryFn: () => listDistricts(),
  });
  const { data: areas = [] } = useQuery({
    queryKey: ["all-areas"],
    queryFn: () => listAreas(),
  });
  const { data: clusters = [] } = useQuery({
    queryKey: ["all-clusters"],
    queryFn: () => listClusters(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<Student>) => updateStudent(Number(id), data),
    onSuccess: (updated: Student) => {
      qc.setQueryData(["student", id], updated);
      qc.invalidateQueries({ queryKey: ["students"] });
      if (enteredViaEdit) navigate(-1);
      else {
        setEditing(false);
        setSaveError("");
      }
    },
    onError: (e: unknown) => {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSaveError(detail ?? "Save failed");
    },
  });

  const formCategoryId = form.category_id ?? null;
  const { data: subCategories = [] } = useQuery({
    queryKey: ["sub-categories", formCategoryId],
    queryFn: () => listSubCategories(formCategoryId ?? undefined),
    enabled: formCategoryId != null,
  });

  if (isLoading) return <p style={{ color: "var(--text-secondary)", padding: 24 }}>Loading…</p>;
  if (!student) return <p style={{ color: "var(--danger)", padding: 24 }}>Student not found.</p>;

  const s = student;
  const kutir = kutirs.find((k) => k.id === s.kutir_id);
  const cluster = clusters.find((c) => c.id === kutir?.cluster_id);
  const area = cluster ? areaMap.get(cluster.area_id) : undefined;
  const district = area ? districts.find((d) => d.id === area.district_id) : undefined;
  const category = categories.find((c) => c.id === s.category_id);
  const subCategory = subCategories.find((sc) => sc.id === s.sub_category_id);

  return (
    <div style={{ maxWidth: 600, padding: "16px 20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          style={{
            background: "none",
            border: "none",
            color: "var(--link-color)",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
          onClick={() => navigate("/students")}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          {s.first_name} {s.last_name}
        </h2>
      </div>

      {saveError && (
        <div
          style={{
            color: "var(--danger)",
            background: "var(--danger-bg,#fef2f2)",
            border: "1px solid var(--danger-border,#fca5a5)",
            borderRadius: 6,
            padding: "8px 12px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {saveError}
        </div>
      )}

      <StudentForm
        form={form}
        setForm={setForm}
        mode={editing ? "edit" : "view"}
        locationLabels={{
          district: district?.name,
          cluster: cluster?.name,
          kutir: kutir?.name,
        }}
        categoryName={category?.name}
        subCategoryName={subCategory?.name}
      />

      {!editing && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button style={grs.btnPrimary} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      )}

      {editing && (
        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
          <button
            style={grs.btnSecondary}
            onClick={() => {
              if (enteredViaEdit) navigate(-1);
              else {
                setEditing(false);
                setForm(studentFormFromDetail(s));
                setSaveError("");
              }
            }}
          >
            Cancel
          </button>
          <button
            style={grs.btnPrimary}
            disabled={updateMut.isPending}
            onClick={() => updateMut.mutate(form)}
          >
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
        Added: {new Date(s.created_at).toLocaleString("en-IN")} &nbsp;·&nbsp; Updated:{" "}
        {new Date(s.updated_at).toLocaleString("en-IN")}
      </p>
    </div>
  );
}

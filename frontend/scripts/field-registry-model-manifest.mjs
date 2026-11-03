/**
 * Field registry ↔ SQLAlchemy model alignment rules.
 * Source of truth for listable columns is the ORM model; *Fields.ts keys may differ
 * for joins (student_id → student).
 *
 * omitFromRegistryRequirement — DB columns that need not appear in *Fields.ts
 *   (PK, timestamps, form-only, FK replaced by a join key, columns rolled into a virtual list key).
 * virtualRegistryKeys — registry keys with no 1:1 column (joins / computed).
 * columnRegistryKey — map model column name → registry key when they differ.
 */

/** @typedef {{
 *   entity: string,
 *   fields: string,
 *   modelRel: string,
 *   className: string,
 *   omitFromRegistryRequirement?: string[],
 *   virtualRegistryKeys?: string[],
 *   columnRegistryKey?: Record<string, string>,
 * }} FieldRegistryModelEntity */

/** @type {FieldRegistryModelEntity[]} */
export const FIELD_REGISTRY_MODEL_ENTITIES = [
  {
    entity: "students",
    fields: "src/constants/studentsFields.ts",
    modelRel: "backend/app/models/students.py",
    className: "Student",
    omitFromRegistryRequirement: [
      "id",
      "created_at",
      "updated_at",
      "first_name",
      "last_name",
      "photo",
      "street",
      "pincode",
      "category_id",
      "sub_category_id",
      "aadhaar",
      "category_cert",
      "birth_cert",
      "residence_proof",
      "medical",
    ],
    virtualRegistryKeys: ["name", "docsCount", "addedDate"],
    columnRegistryKey: {
      created_at: "addedDate",
    },
  },
  {
    entity: "kutirs",
    fields: "src/constants/kutirsFields.ts",
    modelRel: "backend/app/models/kutirs.py",
    className: "Kutir",
    omitFromRegistryRequirement: [
      "id",
      "created_at",
      "updated_at",
      "district_id",
      "location_source",
      "geocoded_at",
    ],
    virtualRegistryKeys: ["teachers"],
  },
  {
    entity: "admissions",
    fields: "src/constants/admissionsFields.ts",
    modelRel: "backend/app/models/students.py",
    className: "StudentExam",
    omitFromRegistryRequirement: [
      "id",
      "created_at",
      "updated_at",
      "student_id",
      "school_id",
      "admitted_school_id",
    ],
    virtualRegistryKeys: ["district", "kutir", "student", "school", "stage", "gender", "scores"],
  },
  {
    entity: "progress",
    fields: "src/constants/progressFields.ts",
    modelRel: "backend/app/models/students.py",
    className: "StudentProgress",
    omitFromRegistryRequirement: [
      "id",
      "created_at",
      "updated_at",
      "student_id",
      "track",
      "transfer_school",
    ],
    virtualRegistryKeys: ["student"],
    columnRegistryKey: {
      student_id: "student",
    },
  },
  {
    entity: "visits",
    fields: "src/constants/visitsFields.ts",
    modelRel: "backend/app/models/visits.py",
    className: "KutirVisit",
    omitFromRegistryRequirement: [
      "id",
      "created_at",
      "updated_at",
      "visited_by_id",
      "avg_attendance_evening",
      "kutir_closed",
      "plan_hindi",
      "plan_math",
      "plan_english",
      "timetable_plan_reason",
      "math_topics_pre",
      "math_topics_upper",
      "english_topics_pre",
      "english_topics_upper",
      "timeslot_reason",
      "regular_students_evening",
      "timeslot_bal_sabha",
      "timeslot_sports",
      "timeslot_yoga",
      "timeslot_value_ed",
      "timeslot_gk_map",
      "reg_admission_forms",
      "reg_attendance_students",
      "reg_daily_activity",
      "reg_observation",
      "reg_students_data",
      "reg_attendance_teachers",
      "reg_students_documents",
    ],
    virtualRegistryKeys: [],
  },
  {
    entity: "schools",
    fields: "src/constants/schoolsFields.ts",
    modelRel: "backend/app/models/schools.py",
    className: "GovtResidentialSchool",
    omitFromRegistryRequirement: ["id", "created_at", "updated_at", "district_id"],
    virtualRegistryKeys: ["district"],
    columnRegistryKey: {
      district_id: "district",
    },
  },
  {
    entity: "examcenters",
    fields: "src/constants/examCentersFields.ts",
    modelRel: "backend/app/models/geo.py",
    className: "ExamCenter",
    omitFromRegistryRequirement: ["id", "created_at", "updated_at", "district_id"],
    virtualRegistryKeys: ["districtName"],
    columnRegistryKey: {
      district_id: "districtName",
    },
  },
  {
    entity: "users",
    fields: "src/constants/usersFields.ts",
    modelRel: "backend/app/models/users.py",
    className: "User",
    omitFromRegistryRequirement: [
      "id",
      "created_at",
      "updated_at",
      "password",
      "is_superuser",
      "first_name",
      "last_name",
    ],
    virtualRegistryKeys: ["name"],
  },
];

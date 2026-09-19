import type { FieldMeta } from "../hooks/useFieldConfig";

export const VISITS_FIELDS: FieldMeta[] = [
  { key: "visit_date",                  label: "Date",                   hideable: false, defaultVisible: true  },
  { key: "kutir_id",                    label: "Kutir",                  hideable: false, defaultVisible: true  },
  { key: "avg_attendance_morning",      label: "Attendance M/E",         hideable: true,  defaultVisible: true  },
  { key: "regular_students_morning",    label: "Regular Students M/E",   hideable: true,  defaultVisible: false },
  { key: "physical_vs_registered",      label: "App vs. Registered Students", hideable: true,  defaultVisible: false },
  { key: "follow_timetable",            label: "Follows Timetable",      hideable: true,  defaultVisible: false },
  { key: "workbook_percentage",         label: "Workbook %",             hideable: true,  defaultVisible: true  },
  { key: "workbook_completion",         label: "Workbook Completion",    hideable: true,  defaultVisible: false },
  { key: "book_availability",           label: "Book Availability",      hideable: true,  defaultVisible: false },
  { key: "kutir_performance",           label: "Performance",            hideable: true,  defaultVisible: true  },
  { key: "cleanliness",                 label: "Cleanliness",            hideable: true,  defaultVisible: true  },
  { key: "hindi_proficiency",           label: "Hindi",                  hideable: true,  defaultVisible: false },
  { key: "english_proficiency",         label: "English",                hideable: true,  defaultVisible: false },
  { key: "maths_proficiency",           label: "Maths",                  hideable: true,  defaultVisible: false },
  { key: "evs_proficiency",             label: "EVS",                    hideable: true,  defaultVisible: false },
  { key: "reasoning_proficiency",       label: "Reasoning",              hideable: true,  defaultVisible: false },
  { key: "material_management",         label: "Material Mgmt",          hideable: true,  defaultVisible: false },
  { key: "grs_prep_remarks",            label: "GRS Prep Remarks",       hideable: true,  defaultVisible: false },
  { key: "final_remarks",               label: "Final Remarks",          hideable: true,  defaultVisible: false },
  { key: "visit_photo",                 label: "Photo",                  hideable: true,  defaultVisible: false },
];

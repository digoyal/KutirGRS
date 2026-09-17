import type { FieldMeta } from "../hooks/useFieldConfig";

export const ADMISSIONS_FIELDS: FieldMeta[] = [
  { key: "district",           label: "District",  hideable: true,  defaultVisible: true  },
  { key: "kutir",              label: "Kutir",     hideable: true,  defaultVisible: true  },
  { key: "student",            label: "Student",   hideable: false, defaultVisible: true  },
  { key: "gender",             label: "Gender",    hideable: true,  defaultVisible: true  },
  { key: "school",             label: "School",    hideable: true,  defaultVisible: true  },
  { key: "stage",              label: "Stage",     hideable: false, defaultVisible: true  },
  { key: "exam_category_id",   label: "Exam Cat.", hideable: true,  defaultVisible: true  },
  { key: "exam_center_id",     label: "Center",    hideable: true,  defaultVisible: false },
  { key: "application_number", label: "App #",     hideable: true,  defaultVisible: false },
  { key: "roll_number",        label: "Roll #",    hideable: true,  defaultVisible: false },
  { key: "scores",             label: "Scores",    hideable: true,  defaultVisible: true  },
];

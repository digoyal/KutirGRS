import type { FieldMeta } from "../hooks/useFieldConfig";

// Single source of truth for Progress table fields.
// Used by: ProgressModal (add/edit/view), table columns, and FieldConfigPage.
export const PROGRESS_FIELDS: FieldMeta[] = [
  { key: "student",                   label: "Student",      hideable: false, defaultVisible: true  },
  { key: "class_in_year",             label: "Class",        hideable: true,  defaultVisible: true  },
  { key: "school_id",                 label: "School",       hideable: true,  defaultVisible: true  },
  { key: "previous_year_percentage",  label: "Prev %",       hideable: true,  defaultVisible: true  },
  { key: "status",                    label: "Status",       hideable: false, defaultVisible: true  },
  { key: "remarks",                   label: "Remarks",      hideable: true,  defaultVisible: false },
];

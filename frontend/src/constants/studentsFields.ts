import type { FieldMeta } from "../hooks/useFieldConfig";

export const STUDENTS_FIELDS: FieldMeta[] = [
  { key: "name",              label: "Name",        hideable: false, defaultVisible: true  },
  { key: "gender",            label: "Gender",      hideable: true,  defaultVisible: true  },
  { key: "phone",             label: "Phone",       hideable: true,  defaultVisible: true  },
  { key: "father_name",       label: "Father",      hideable: true,  defaultVisible: true  },
  { key: "mother_name",       label: "Mother",      hideable: true,  defaultVisible: false },
  { key: "docsCount",         label: "Docs",        hideable: true,  defaultVisible: true  },
  { key: "addedDate",         label: "Added",       hideable: true,  defaultVisible: false },
  { key: "kutir_id",          label: "Kutir",       hideable: true,  defaultVisible: false },
  { key: "dob",               label: "Date of Birth", hideable: true, defaultVisible: false },
  { key: "email",             label: "Email",       hideable: true,  defaultVisible: false },
  { key: "alt_contact_name",  label: "Alt Contact", hideable: true,  defaultVisible: false },
  { key: "alt_contact_phone", label: "Alt Phone",   hideable: true,  defaultVisible: false },
];

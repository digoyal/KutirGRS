import type { FieldMeta } from "../hooks/useFieldConfig";

export const EXAM_CENTERS_FIELDS: FieldMeta[] = [
  { key: "name",         label: "Name",     hideable: false, defaultVisible: true  },
  { key: "street",       label: "Street",   hideable: true,  defaultVisible: true  },
  { key: "city",         label: "City",     hideable: true,  defaultVisible: true  },
  { key: "districtName", label: "District", hideable: true,  defaultVisible: true  },
  { key: "state",        label: "State",    hideable: true,  defaultVisible: true  },
  { key: "pincode",      label: "Pincode",  hideable: true,  defaultVisible: false },
];

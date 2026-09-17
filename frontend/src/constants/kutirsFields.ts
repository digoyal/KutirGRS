import type { FieldMeta } from "../hooks/useFieldConfig";

export const KUTIRS_FIELDS: FieldMeta[] = [
  { key: "name",           label: "Name",        hideable: false, defaultVisible: true  },
  { key: "kutir_type",     label: "Type",        hideable: true,  defaultVisible: true  },
  { key: "cluster_id",     label: "Cluster",     hideable: true,  defaultVisible: false },
  { key: "village",        label: "Village",     hideable: true,  defaultVisible: true  },
  { key: "street",         label: "Street",      hideable: true,  defaultVisible: false },
  { key: "state",          label: "State",       hideable: true,  defaultVisible: false },
  { key: "pincode",        label: "Pincode",     hideable: true,  defaultVisible: false },
  { key: "enrollment_5th", label: "5th Enroll",  hideable: true,  defaultVisible: true  },
  { key: "enrollment_8th", label: "8th Enroll",  hideable: true,  defaultVisible: true  },
  { key: "teachers",       label: "Teachers",    hideable: true,  defaultVisible: false },
];

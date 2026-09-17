import type { FieldMeta } from "../hooks/useFieldConfig";

export const SCHOOLS_FIELDS: FieldMeta[] = [
  { key: "name",        label: "Name",         hideable: false, defaultVisible: true  },
  { key: "school_type", label: "Type",         hideable: true,  defaultVisible: true  },
  { key: "city",        label: "City / Block", hideable: true,  defaultVisible: true  },
  { key: "district",    label: "District",     hideable: true,  defaultVisible: true  },
  { key: "state",       label: "State",        hideable: true,  defaultVisible: true  },
  { key: "street",      label: "Street",       hideable: true,  defaultVisible: false },
  { key: "pincode",     label: "Pincode",      hideable: true,  defaultVisible: false },
];

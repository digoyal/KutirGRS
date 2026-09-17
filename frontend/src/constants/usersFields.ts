import type { FieldMeta } from "../hooks/useFieldConfig";

export const USERS_FIELDS: FieldMeta[] = [
  { key: "username",  label: "Username", hideable: false, defaultVisible: true  },
  { key: "name",      label: "Name",     hideable: true,  defaultVisible: true  },
  { key: "title",     label: "Role",     hideable: true,  defaultVisible: true  },
  { key: "phone",     label: "Phone",    hideable: true,  defaultVisible: true  },
  { key: "is_active", label: "Status",   hideable: true,  defaultVisible: true  },
  { key: "email",     label: "Email",    hideable: true,  defaultVisible: false },
];

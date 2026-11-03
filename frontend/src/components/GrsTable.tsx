import { Table, type Col } from "@parivaar/ui";
import type { ComponentProps } from "react";

type GrsTableProps<T extends object> = ComponentProps<typeof Table<T>>;

/** KutirGRS table: full-width shell in the authenticated app layout. */
export function GrsTable<T extends object>(props: GrsTableProps<T>) {
  return <Table {...props} shellFullWidth={props.shellFullWidth ?? true} />;
}

export { Table, type Col };

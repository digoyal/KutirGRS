import { Table, type Col } from "@parivaar/ui";
import type { ComponentProps } from "react";
import { useLocation } from "react-router-dom";
import { isListHubPath } from "../constants/listHubRoutes";

type GrsTableProps<T extends object> = ComponentProps<typeof Table<T>>;

/** KutirGRS table: full-width shell on GRS list hub routes (Students, Kutirs, Admissions, Progress). */
export function GrsTable<T extends object>(props: GrsTableProps<T>) {
  const { pathname } = useLocation();
  const onListHub = isListHubPath(pathname);
  return <Table {...props} shellFullWidth={onListHub || props.shellFullWidth} />;
}

export { Table, type Col };

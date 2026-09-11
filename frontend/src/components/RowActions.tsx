import { grs } from "../styles/grs";

interface RowActionsProps {
  onView?:   () => void;
  onEdit?:   () => void;
  onDelete?: () => void;
}

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export function RowActions({ onView, onEdit, onDelete }: RowActionsProps) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      {onView && (
        <button onClick={onView} title="View" style={grs.btnIcon}>
          <IconEye />
        </button>
      )}
      {onEdit && (
        <button onClick={onEdit} title="Edit" style={grs.btnIcon}>
          <IconEdit />
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} title="Delete" style={{ ...grs.btnIcon, color: "var(--color-danger, #e53e3e)" }}>
          <IconTrash />
        </button>
      )}
    </div>
  );
}

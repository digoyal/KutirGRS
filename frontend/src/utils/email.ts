/** Basic format check (not mailbox verification). */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  return EMAIL_FORMAT.test(s);
}

/** Non-empty invalid email → message; empty/valid → null (required handled separately). */
export function emailFormatError(value: string | null | undefined): string | null {
  const s = (value ?? "").trim();
  if (!s) return null;
  if (!isValidEmailFormat(s)) return "Enter a valid email address";
  return null;
}

/**
 /**
  * Escapes special characters in string to prevent HTML injection in document generation.
  */
export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  const stringValue = String(str);
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

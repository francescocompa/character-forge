/**
 * Visits every string leaf in a JSON-like value, calling `visit(path, value)`.
 * Used for markup-lint (every summary/note/markdown field is a candidate) and
 * for finding `{ref:...}` tags embedded in markup for referential integrity.
 * Running over every string leaf — not an explicit field allowlist — means
 * newly added markup fields are covered automatically; it's safe because
 * `parseMarkup` never errors on a string with no tag-like content in it.
 */
export function walkStrings(
  value: unknown,
  path: string,
  visit: (path: string, value: string) => void,
): void {
  if (typeof value === 'string') {
    visit(path, value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${path}[${i}]`, visit))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      walkStrings(val, path ? `${path}.${key}` : key, visit)
    }
  }
}

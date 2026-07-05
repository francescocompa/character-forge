import type { CharacterFile, SessionFile } from '@character-forge/schema/types.ts'

/**
 * Export the session layer as a downloadable `<name>.session.json` — the file a
 * later compile session reads to adopt in-session additions into the base build
 * (T15 deliverable 4). Pure builders here; the DOM download side-effect is
 * {@link downloadSession}, guarded for non-browser environments so tests and SSR
 * can call the builders directly.
 */

/** Slugify a character name into a safe filename stem (letters/digits/dash). */
export function sessionFileStem(character: Pick<CharacterFile, 'meta'>): string {
  const base = character.meta.name.trim() || 'character'
  const slug = base
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return slug || 'character'
}

/** `<name>.session.json`, mirroring the character file's naming so the pair is obvious in a folder. */
export function sessionFileName(character: Pick<CharacterFile, 'meta'>): string {
  return `${sessionFileStem(character)}.session.json`
}

/** Pretty-printed session JSON, ready to write. Validates against session.schema.json by construction. */
export function serializeSession(session: SessionFile): string {
  return `${JSON.stringify(session, null, 2)}\n`
}

/** Trigger a browser download of the session file. No-op (returns false) outside a DOM. */
export function downloadSession(
  character: Pick<CharacterFile, 'meta'>,
  session: SessionFile,
): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const blob = new Blob([serializeSession(session)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = sessionFileName(character)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}

import type { CharacterFile } from '@character-forge/schema/types.ts'
import { CHARACTERS_STORE, deleteSessionsFor, getDb } from './db'

/**
 * Persistent home for imported character files (T16). The app never writes the
 * character file's *content* (scope §4) — this store only holds imported copies
 * verbatim plus a little management metadata (a display alias, when imported),
 * so the app works fully offline after the first import with no re-pick on
 * reload.
 */
export interface StoredCharacter {
  /** `characterId::variantLabel` — variants of one character share the id, differ here. */
  key: string
  characterId: string
  variantLabel?: string
  /** Rename alias (management only; never touches file data). */
  alias?: string
  importedAt: string
  character: CharacterFile
}

/** Record key: groups variants of one character (same id) while keeping them distinct. */
export function characterKey(characterId: string, variantLabel: string | undefined): string {
  return `${characterId}::${variantLabel ?? ''}`
}

/** Key for a character file straight from its meta. */
export function keyForCharacter(character: CharacterFile): string {
  return characterKey(character.meta.characterId, character.meta.variantLabel)
}

export async function listStoredCharacters(): Promise<StoredCharacter[]> {
  const db = await getDb()
  return (await db.getAll(CHARACTERS_STORE)) as StoredCharacter[]
}

export async function getStoredCharacter(key: string): Promise<StoredCharacter | undefined> {
  const db = await getDb()
  return db.get(CHARACTERS_STORE, key)
}

/**
 * Store (or refresh) a character file. On refresh — same key already present —
 * the prior `alias` and original `importedAt` are preserved (a re-import updates
 * the build, not the management metadata); the session layer survives untouched
 * (it lives in its own store, reconciled on next open by the session engine).
 */
export async function putStoredCharacter(character: CharacterFile): Promise<StoredCharacter> {
  const db = await getDb()
  const key = keyForCharacter(character)
  const existing = (await db.get(CHARACTERS_STORE, key)) as StoredCharacter | undefined
  const record: StoredCharacter = {
    key,
    characterId: character.meta.characterId,
    variantLabel: character.meta.variantLabel,
    alias: existing?.alias,
    importedAt: existing?.importedAt ?? new Date().toISOString(),
    character,
  }
  await db.put(CHARACTERS_STORE, record, key)
  return record
}

/** Delete a stored character variant and wipe its session state (deliverable 3). */
export async function deleteStoredCharacter(key: string): Promise<void> {
  const db = await getDb()
  const record = (await db.get(CHARACTERS_STORE, key)) as StoredCharacter | undefined
  await db.delete(CHARACTERS_STORE, key)
  if (record) await deleteSessionsFor(record.characterId, record.variantLabel)
}

/**
 * Set the display alias for a character. The alias is a property of the
 * character (not a single variant), so it is written to every variant record
 * sharing the id — the list stays consistent whichever variant is open. Empty
 * string clears it (reverting to the file's `meta.name`).
 */
export async function setCharacterAlias(characterId: string, alias: string): Promise<void> {
  const db = await getDb()
  const all = (await db.getAll(CHARACTERS_STORE)) as StoredCharacter[]
  const trimmed = alias.trim()
  const tx = db.transaction(CHARACTERS_STORE, 'readwrite')
  await Promise.all(
    all
      .filter((r) => r.characterId === characterId)
      .map((r) => tx.store.put({ ...r, alias: trimmed || undefined }, r.key)),
  )
  await tx.done
}

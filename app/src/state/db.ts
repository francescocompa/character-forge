import { openDB, type IDBPDatabase } from 'idb'
import type { SessionFile } from '@character-forge/schema/types.ts'

const DB_NAME = 'character-forge-sessions'
// v2 (T16) adds the `characters` store so imported character files persist
// on-device (the app works fully offline after import, no re-pick on reload).
const DB_VERSION = 2
export const SESSIONS_STORE = 'sessions'
export const CHARACTERS_STORE = 'characters'

/** Composite key: characterId + variant + characterFormatVersion (a version bump starts a fresh session). */
export function sessionKey(
  characterId: string,
  variantLabel: string | undefined,
  characterFormatVersion: number,
): string {
  return `${characterId}::${variantLabel ?? ''}::${characterFormatVersion}`
}

let dbPromise: Promise<IDBPDatabase> | undefined

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) db.createObjectStore(SESSIONS_STORE)
        if (!db.objectStoreNames.contains(CHARACTERS_STORE)) db.createObjectStore(CHARACTERS_STORE)
      },
    })
  }
  return dbPromise
}

export async function loadSession(key: string): Promise<SessionFile | undefined> {
  const db = await getDb()
  return db.get(SESSIONS_STORE, key)
}

export async function saveSession(key: string, session: SessionFile): Promise<void> {
  const db = await getDb()
  await db.put(SESSIONS_STORE, session, key)
}

/**
 * Delete every session belonging to a character+variant, regardless of the
 * `characterFormatVersion` suffix in the key (a character delete wipes its play
 * state, T16 deliverable 3). Keys are `characterId::variantLabel::formatVersion`.
 */
export async function deleteSessionsFor(
  characterId: string,
  variantLabel: string | undefined,
): Promise<void> {
  const db = await getDb()
  const prefix = `${characterId}::${variantLabel ?? ''}::`
  const keys = (await db.getAllKeys(SESSIONS_STORE)) as string[]
  const tx = db.transaction(SESSIONS_STORE, 'readwrite')
  await Promise.all(keys.filter((k) => k.startsWith(prefix)).map((k) => tx.store.delete(k)))
  await tx.done
}

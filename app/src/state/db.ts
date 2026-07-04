import { openDB, type IDBPDatabase } from 'idb'
import type { SessionFile } from '@character-forge/schema/types.ts'

const DB_NAME = 'character-forge-sessions'
const DB_VERSION = 1
const STORE_NAME = 'sessions'

/** Composite key: characterId + variant + characterFormatVersion (a version bump starts a fresh session). */
export function sessionKey(
  characterId: string,
  variantLabel: string | undefined,
  characterFormatVersion: number,
): string {
  return `${characterId}::${variantLabel ?? ''}::${characterFormatVersion}`
}

let dbPromise: Promise<IDBPDatabase> | undefined

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
      },
    })
  }
  return dbPromise
}

export async function loadSession(key: string): Promise<SessionFile | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, key)
}

export async function saveSession(key: string, session: SessionFile): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, session, key)
}

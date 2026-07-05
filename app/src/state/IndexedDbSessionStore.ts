import type { CharacterFile, SessionFile, SessionStore } from '@character-forge/schema/types.ts'
import { createSessionEngine, reconcileSessionState, seedSessionState } from './sessionEngine'
import { loadSession, saveSession, sessionKey } from './db'

const DEBOUNCE_MS = 400

export interface IndexedDbSessionStore extends SessionStore {
  /**
   * Resolves once the initial hydration attempt (a saved session found and
   * reconciled, none found, or IndexedDB unavailable) has settled. Not part
   * of the shared `SessionStore` contract — for tests/debugging only.
   */
  ready: Promise<void>
}

/**
 * Wraps the synchronous {@link createSessionEngine} with IndexedDB persistence,
 * keyed by characterId + variant + formatVersion (D12, session.schema.json).
 *
 * Returns synchronously with a fresh in-memory seed — first paint never blocks
 * on IndexedDB, and the store degrades gracefully where it doesn't exist (SSR,
 * privacy mode, unit tests run under Node) — then hydrates from any saved
 * session in the background. Writes are debounced and flushed immediately on
 * `visibilitychange`/`pagehide`, since mobile Safari kills backgrounded tabs
 * without warning.
 */
export function createIndexedDbSessionStore(character: CharacterFile): IndexedDbSessionStore {
  const key = sessionKey(
    character.meta.characterId,
    character.meta.variantLabel,
    character.formatVersion,
  )
  const engine = createSessionEngine(character, seedSessionState(character))

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let pendingSave: SessionFile | undefined

  function flush() {
    if (saveTimer !== undefined) {
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    const toSave = pendingSave
    pendingSave = undefined
    if (!toSave) return
    saveSession(key, toSave).catch(() => {
      // IndexedDB unavailable or quota exceeded — the tab keeps working in-memory only.
    })
  }

  function scheduleSave(state: SessionFile) {
    pendingSave = state
    if (saveTimer !== undefined) clearTimeout(saveTimer)
    saveTimer = setTimeout(flush, DEBOUNCE_MS)
  }

  engine.subscribe(scheduleSave)

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
  }

  const ready = loadSession(key)
    .then((saved) => {
      if (saved) engine.hydrate(reconcileSessionState(saved, character))
    })
    .catch(() => {
      // No IndexedDB in this environment — stay on the fresh in-memory seed.
    })

  return { ...engine, ready }
}

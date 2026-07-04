import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { CharacterFile, SessionFile, SessionStore } from '@character-forge/schema/types.ts'
import { createMemorySessionStore } from './memoryStore'

/**
 * Provides the session-layer {@link SessionStore} to the view tree. In v1 this
 * is the in-memory stub ({@link createMemorySessionStore}); T14 replaces the
 * implementation, not this wiring. `useSessionState` subscribes a component to
 * the live snapshot so trackers re-render on every mutation.
 */
const SessionContext = createContext<SessionStore | null>(null)

export function useSession(): SessionStore {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}

/** Subscribe to the live session snapshot; re-renders on any tracker/loadout change. */
export function useSessionState(): SessionFile {
  const store = useSession()
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

export interface SessionProviderProps {
  character: CharacterFile
  /** Inject a store in tests; defaults to a fresh in-memory store for the file. */
  store?: SessionStore
  children: ReactNode
}

export function SessionProvider({ character, store, children }: SessionProviderProps) {
  // One store per character identity for the life of the provider. Keyed on the
  // ref so a same-identity re-render never rebuilds (and loses) session state.
  const ref = useRef<{ id: string; store: SessionStore } | null>(null)
  const id = `${character.meta.characterId}::${character.meta.variantLabel ?? ''}`
  const value = useMemo(() => {
    if (store) return store
    if (!ref.current || ref.current.id !== id) {
      ref.current = { id, store: createMemorySessionStore(character) }
    }
    return ref.current.store
  }, [id, store, character])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

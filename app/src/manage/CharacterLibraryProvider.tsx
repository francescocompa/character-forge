import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import {
  deleteStoredCharacter,
  listStoredCharacters,
  putStoredCharacter,
  setCharacterAlias,
  type StoredCharacter,
} from '../state/characterDb'
import { groupCharacters, type CharacterGroup } from './group'

/**
 * Owns the on-device character library (T16): the list of imported files, the
 * current selection, and every management mutation (import, delete, rename).
 * Loading is async (IndexedDB) but degrades to an empty list where IndexedDB is
 * unavailable, so the app always renders. Views read the grouped-by-character
 * shape (D12); mutations reload the list so the UI reflects storage.
 */
export interface CharacterLibraryValue {
  loading: boolean
  groups: CharacterGroup[]
  /** Selected character id (a group), or null on the list screen. */
  selectedId: string | null
  select: (characterId: string) => void
  clearSelection: () => void
  /** Store or refresh a validated character, then reload. */
  saveCharacter: (character: CharacterFile) => Promise<void>
  /** Delete a variant (by record key) and wipe its session, then reload. */
  removeVariant: (key: string) => Promise<void>
  /** Set/clear a character's display alias, then reload. */
  renameCharacter: (characterId: string, alias: string) => Promise<void>
  reload: () => Promise<void>
}

const LibraryContext = createContext<CharacterLibraryValue | null>(null)

export function useCharacterLibrary(): CharacterLibraryValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useCharacterLibrary must be used within a CharacterLibraryProvider')
  return ctx
}

export function CharacterLibraryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [stored, setStored] = useState<StoredCharacter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setStored(await listStoredCharacters())
    } catch {
      // IndexedDB unavailable (privacy mode, SSR) — nothing to list.
      setStored([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const groups = useMemo(() => groupCharacters(stored), [stored])

  // Auto-open when the library holds exactly one character (deliverable 1: the
  // list screen shows "when >1 or none"). Fires once, on the first settled load,
  // so pressing Back afterwards still reaches the single-card list.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (loading || autoOpened.current) return
    autoOpened.current = true
    if (groups.length === 1) setSelectedId(groups[0].characterId)
  }, [loading, groups])

  const saveCharacter = useCallback(
    async (character: CharacterFile) => {
      await putStoredCharacter(character)
      await reload()
    },
    [reload],
  )

  const removeVariant = useCallback(
    async (key: string) => {
      await deleteStoredCharacter(key)
      await reload()
    },
    [reload],
  )

  const renameCharacter = useCallback(
    async (characterId: string, alias: string) => {
      await setCharacterAlias(characterId, alias)
      await reload()
    },
    [reload],
  )

  const value = useMemo<CharacterLibraryValue>(
    () => ({
      loading,
      groups,
      selectedId,
      select: setSelectedId,
      clearSelection: () => setSelectedId(null),
      saveCharacter,
      removeVariant,
      renameCharacter,
      reload,
    }),
    [loading, groups, selectedId, saveCharacter, removeVariant, renameCharacter, reload],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

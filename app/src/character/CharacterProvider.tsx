import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { isFuture, isVisible, type ViewMode } from './visibility'

/**
 * Holds the loaded character file and the global Level/Build view mode (D14),
 * and exposes the mode-aware visibility helpers every view consumes. Kept
 * deliberately small: T16 replaces the file-loading mechanics, T14 the session
 * engine — this provider only owns "which character, which mode, what shows".
 */
export interface CharacterContextValue {
  character: CharacterFile
  currentLevel: number
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
  /** Mode-aware: does an item with this `unlockLevel` render right now? */
  isVisible: (unlockLevel?: number) => boolean
  /** Is this item future content (grayed + badged in Build view)? */
  isFuture: (unlockLevel?: number) => boolean
  /** Display name for a library ref: `displayName` → library entry name → the ref itself. */
  nameOf: (ref: string | undefined, displayName?: string) => string
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

export function useCharacter(): CharacterContextValue {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within a CharacterProvider')
  return ctx
}

// View mode is remembered per character across remounts (D14: "persists per
// character"). A module-level map is enough until real persistence (T14/T16);
// it survives navigation between views without touching the read-only file.
const modeMemory = new Map<string, ViewMode>()

export interface CharacterProviderProps {
  character: CharacterFile
  children: ReactNode
}

export function CharacterProvider({ character, children }: CharacterProviderProps) {
  const characterId = character.meta.characterId
  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => modeMemory.get(characterId) ?? 'level',
  )

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      modeMemory.set(characterId, mode)
      setViewModeState(mode)
    },
    [characterId],
  )
  const toggleViewMode = useCallback(
    () => setViewMode(viewMode === 'level' ? 'build' : 'level'),
    [viewMode, setViewMode],
  )

  const currentLevel = character.currentLevel

  const value = useMemo<CharacterContextValue>(() => {
    const library = character.library
    return {
      character,
      currentLevel,
      viewMode,
      setViewMode,
      toggleViewMode,
      isVisible: (unlockLevel?: number) => isVisible(unlockLevel, currentLevel, viewMode),
      isFuture: (unlockLevel?: number) => isFuture(unlockLevel, currentLevel),
      nameOf: (ref, displayName) => displayName ?? (ref ? library[ref]?.name ?? ref : ''),
    }
  }, [character, currentLevel, viewMode, setViewMode, toggleViewMode])

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>
}

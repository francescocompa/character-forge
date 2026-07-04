import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Extract } from '@character-forge/schema/types.ts'
import { LibrarySurface } from './LibrarySurface'
import type { Rect } from './position'
import './library.css'

/**
 * Holds the current character's `library` map and owns the single open popover
 * (T07). A view wires `SheetMarkup`'s `onRef` to `openRef` once at its root;
 * every `{ref:…}` on the sheet then opens the embedded extract. Refs tapped
 * *inside* an open extract push onto a small stack so "‹ Back" returns to the
 * previous entry rather than closing.
 */
export interface LibraryContextValue {
  /** Open the extract for `refKey`, anchoring the desktop popover to `anchorEl`. */
  openRef: (refKey: string, anchorEl?: HTMLElement | null) => void
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider')
  return ctx
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export interface LibraryProviderProps {
  library: Record<string, Extract>
  children: ReactNode
}

export function LibraryProvider({ library, children }: LibraryProviderProps) {
  const [stack, setStack] = useState<string[]>([])
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const openRef = useCallback((refKey: string, anchorEl?: HTMLElement | null) => {
    // Views wire `SheetMarkup`'s `onRef` (key only, no element), so the trigger
    // is usually the RefLink that a click/Enter just focused. Anchor the desktop
    // popover to it and restore focus there on close. `document.body` means no
    // real trigger (programmatic open) — the surface centers itself instead.
    const trigger = anchorEl ?? (document.activeElement as HTMLElement | null)
    const anchored = trigger && trigger !== document.body ? trigger : null
    triggerRef.current = anchored && typeof anchored.focus === 'function' ? anchored : null
    setAnchorRect(anchored ? rectOf(anchored) : null)
    setStack([refKey])
  }, [])

  const pushRef = useCallback((refKey: string) => setStack((s) => [...s, refKey]), [])
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const close = useCallback(() => {
    setStack([])
    setAnchorRect(null)
    triggerRef.current?.focus()
    triggerRef.current = null
  }, [])

  const value = useMemo<LibraryContextValue>(() => ({ openRef }), [openRef])
  const currentKey = stack[stack.length - 1]

  return (
    <LibraryContext.Provider value={value}>
      {children}
      {currentKey !== undefined && (
        <LibrarySurface
          entry={library[currentKey]}
          refKey={currentKey}
          anchorRect={anchorRect}
          canBack={stack.length > 1}
          onBack={back}
          onClose={close}
          onRef={pushRef}
        />
      )}
    </LibraryContext.Provider>
  )
}

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { Extract } from '@character-forge/schema/types.ts'
import { ExtractMarkdown } from './ExtractMarkdown'
import { placePopover, type Rect } from './position'

/**
 * The one open library surface (T07). Desktop (≥ 768 px): an anchored popover
 * placed near the trigger and clamped to the viewport. Mobile: a bottom sheet,
 * dismissable by scrim tap or a downward drag. Both are portalled to <body> so
 * opening never shifts the underlying sheet, trap focus while open, close on
 * Esc/scrim, and return focus to the trigger on close (handled by the provider).
 */
export interface LibrarySurfaceProps {
  entry: Extract | undefined
  refKey: string
  anchorRect: Rect | null
  canBack: boolean
  onBack: () => void
  onClose: () => void
  /** A `{ref:…}` tapped inside the extract — pushes onto the surface's stack. */
  onRef: (refKey: string) => void
}

const MOBILE_QUERY = '(max-width: 767.98px)'
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
const DRAG_DISMISS_PX = 90

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return mobile
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
}

function formatMeta(entry: Extract): string {
  const edition = entry.edition === 'Homebrew' ? 'Homebrew' : entry.edition
  const parts = [edition, entry.source]
  if (entry.page !== undefined && entry.page !== '') parts.push(`p.${entry.page}`)
  // Homebrew entries often carry source "Homebrew" too — don't say it twice.
  return parts.filter((p, i) => p && parts.indexOf(p) === i).join(' · ')
}

export function LibrarySurface({
  entry,
  refKey,
  anchorRect,
  canBack,
  onBack,
  onClose,
  onRef,
}: LibrarySurfaceProps) {
  const isMobile = useIsMobile()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<CSSProperties | null>(null)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)

  // Focus into the surface on open; trap Tab and close on Esc while open.
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const focusables = getFocusable(el)
    ;(focusables[0] ?? el).focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable(el as HTMLElement)
      if (items.length === 0) {
        e.preventDefault()
        ;(el as HTMLElement).focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  // Desktop: measure the rendered surface, then place it near the anchor (or
  // centered when opened without one). Mobile ignores this — CSS pins the sheet.
  useLayoutEffect(() => {
    if (isMobile) {
      setPos(null)
      return
    }
    const el = surfaceRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (anchorRect) {
      const placement = placePopover(
        anchorRect,
        { width: rect.width, height: rect.height },
        { width: vw, height: vh },
      )
      setPos({ top: placement.top, left: placement.left, maxHeight: placement.maxHeight })
    } else {
      setPos({
        top: Math.max(8, (vh - rect.height) / 2),
        left: Math.max(8, (vw - rect.width) / 2),
        maxHeight: vh - 16,
      })
    }
  }, [isMobile, anchorRect, refKey])

  const onDragStart = useCallback((e: ReactPointerEvent) => {
    dragStart.current = e.clientY
    setDragY(0)
  }, [])
  const onDragMove = useCallback((e: ReactPointerEvent) => {
    if (dragStart.current === null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }, [])
  const onDragEnd = useCallback(() => {
    if (dragStart.current !== null && dragY > DRAG_DISMISS_PX) onClose()
    dragStart.current = null
    setDragY(0)
  }, [dragY, onClose])

  // Desktop popover stays hidden until measured, so it never flashes at 0,0.
  const desktopStyle: CSSProperties = isMobile
    ? {}
    : (pos ?? { visibility: 'hidden', top: 0, left: 0 })
  const mobileStyle: CSSProperties = isMobile
    ? { transform: dragY ? `translateY(${dragY}px)` : undefined }
    : {}

  const surface = (
    <div className="lib-overlay">
      <div className="lib-scrim" onClick={onClose} />
      <div
        ref={surfaceRef}
        className={isMobile ? 'lib-surface lib-sheet' : 'lib-surface lib-popover'}
        role="dialog"
        aria-modal="true"
        aria-label={entry?.name ?? refKey}
        tabIndex={-1}
        style={{ ...desktopStyle, ...mobileStyle }}
      >
        {isMobile && (
          <div
            className="lib-grabber"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <span className="lib-grabber-bar" />
          </div>
        )}
        <header className="lib-header">
          {canBack && (
            <button
              type="button"
              className="lib-icon-btn lib-back"
              onClick={onBack}
              aria-label="Back"
            >
              ‹
            </button>
          )}
          <div className="lib-titles">
            <span className="lib-name">{entry?.name ?? refKey}</span>
            {entry && <span className="lib-type">{entry.type}</span>}
          </div>
          <button
            type="button"
            className="lib-icon-btn lib-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="lib-body">
          {entry ? (
            <ExtractMarkdown source={entry.markdown} onRef={onRef} />
          ) : (
            <p className="lib-missing">“{refKey}” isn’t in this character’s library.</p>
          )}
        </div>
        {entry && <footer className="lib-footer">{formatMeta(entry)}</footer>}
      </div>
    </div>
  )

  if (typeof document === 'undefined') return surface
  return createPortal(surface, document.body)
}

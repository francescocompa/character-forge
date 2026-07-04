import { useEffect, useState, type ReactNode } from 'react'

const DESKTOP_QUERY = '(min-width: 768px)'

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setDesktop(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return desktop
}

export interface CollapsibleSectionProps {
  title: ReactNode
  children: ReactNode
  className?: string
}

/**
 * A features-page section: collapsible on mobile (T09 deliverable — tap the
 * header to fold), always expanded on desktop regardless of the fold state
 * (state persists per section instance, in memory only — no session write).
 */
export function CollapsibleSection({ title, children, className }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(true)
  const isDesktop = useIsDesktop()
  const expanded = isDesktop || open

  return (
    <section className={`feature-section ${className ?? ''}`}>
      <button
        type="button"
        className="feature-section__header"
        aria-expanded={expanded}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="feature-section__title">{title}</span>
        <span className="feature-section__chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && <div className="feature-section__body">{children}</div>}
    </section>
  )
}

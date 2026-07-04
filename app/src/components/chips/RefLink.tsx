export interface RefLinkProps {
  label: string
  /** Popover wiring is T07's; without a handler this renders as plain styled text. */
  onClick?: () => void
}

/** `{ref:KEY}` / `{ref:KEY|LABEL}` — tappable term that opens a library popover. */
export function RefLink({ label, onClick }: RefLinkProps) {
  if (onClick) {
    return (
      <button type="button" className="chip chip--tappable ref-link" onClick={onClick}>
        {label}
      </button>
    )
  }
  return <span className="ref-link">{label}</span>
}

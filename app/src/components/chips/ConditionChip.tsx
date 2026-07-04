export interface ConditionChipProps {
  name: string
  /** Popover wiring is T07's — this stays presentational and just exposes the hook. */
  onClick?: () => void
}

/** `{cond:NAME}` — condition chip; tappable when a popover extract exists. */
export function ConditionChip({ name, onClick }: ConditionChipProps) {
  if (onClick) {
    return (
      <button type="button" className="chip chip--tappable condition-chip" onClick={onClick}>
        {name}
      </button>
    )
  }
  return <span className="chip condition-chip">{name}</span>
}

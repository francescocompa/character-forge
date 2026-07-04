import type { Ability } from '@character-forge/schema/types.ts'
import { ABILITY_COLOR } from './colorMaps'
import type { CSSVarStyle } from './css-vars'

export interface SaveDCBadgeProps {
  ability: Ability
  /** Omitted when the source text doesn't restate the number (markup-grammar.md §3). */
  dc?: number
}

/** `{save:ABIL}` / `{save:ABIL|DC}` — ability-colored save badge. */
export function SaveDCBadge({ ability, dc }: SaveDCBadgeProps) {
  const style: CSSVarStyle = { '--chip-fg': ABILITY_COLOR[ability] }
  return (
    <span className="chip save-badge" style={style}>
      {ability}
      {dc !== undefined && <span className="save-badge__dc">DC {dc}</span>}
    </span>
  )
}

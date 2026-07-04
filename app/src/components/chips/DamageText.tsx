import { damageColor } from './colorMaps'
import type { CSSVarStyle } from './css-vars'

export interface DamageTextProps {
  /** Recognized types are colored (markup-grammar.md §3); anything else falls back to neutral. */
  type?: string
  /** Dice/amount, e.g. "1d6" or "2d8+3". */
  dice?: string
}

/**
 * Covers all three damage-related tags with one component:
 * - `type` + `dice` → `{dmg:TYPE|DICE}`, typed damage
 * - `dice` only     → `{dice:DICE}`, neutral untyped dice
 * - `type` only     → `{dtype:TYPE}`, bare damage-type reference
 */
export function DamageText({ type, dice }: DamageTextProps) {
  const style: CSSVarStyle = { '--chip-fg': damageColor(type) }
  return (
    <span className="damage-text" style={style}>
      {dice && <span className="damage-text__dice">{dice}</span>}
      {type && <span className="damage-text__type">{type}</span>}
    </span>
  )
}

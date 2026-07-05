import { damageColor } from './colorMaps'
import type { CSSVarStyle } from './css-vars'
import { rollDamage, rollableProps } from '../../dice'

/** A dice string is rollable when it actually contains a die term (e.g. "1d8+3", not a bare "3" or prose). */
const ROLLABLE = /\d*d\d+/i

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
  const rollable = dice ? ROLLABLE.test(dice) : false
  const rollProps = rollable
    ? rollableProps(() => rollDamage(type ? `${type} damage` : 'Damage', dice as string, type), {
        expr: dice,
        className: 'damage-text',
        label: `Roll ${dice}${type ? ` ${type} damage` : ''}`,
      })
    : { className: 'damage-text' }
  return (
    <span style={style} {...rollProps}>
      {dice && <span className="damage-text__dice">{dice}</span>}
      {type && <span className="damage-text__type">{type}</span>}
    </span>
  )
}

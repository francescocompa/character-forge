import type { Ability } from '@character-forge/schema/types.ts'
import { ABILITY_COLOR, ABILITY_SOFT } from './colorMaps'
import type { CSSVarStyle } from './css-vars'

export interface AbilityChipProps {
  ability: Ability
  /** Score/modifier to show next to the abbreviation, e.g. 16 or "+3". */
  value?: number | string
}

/** `{a:ABIL}` — ability-colored chip with the abbreviation, optional value. */
export function AbilityChip({ ability, value }: AbilityChipProps) {
  const style: CSSVarStyle = {
    '--chip-fg': ABILITY_COLOR[ability],
    '--chip-bg': ABILITY_SOFT[ability],
  }
  return (
    <span className="chip ability-chip" style={style}>
      <span>{ability}</span>
      {value !== undefined && <span className="ability-chip__value">{value}</span>}
    </span>
  )
}

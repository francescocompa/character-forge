import { DiceStateIcon } from './DiceStateIcon'

/** `{dis}` — disadvantage: red/orange die, down chevron (scope §2.1). */
export function DisBadge() {
  return <DiceStateIcon direction="down" colorVar="var(--dis)" label="Disadvantage" />
}

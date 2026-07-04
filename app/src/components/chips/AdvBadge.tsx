import { DiceStateIcon } from './DiceStateIcon'

/** `{adv}` — Francesco's shorthand "EDGE" for advantage (scope §2.1): green die, up chevron. */
export function AdvBadge() {
  return <DiceStateIcon direction="up" colorVar="var(--adv)" label="Advantage (EDGE)" />
}

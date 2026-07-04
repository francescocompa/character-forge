import type { SlotPool } from '@character-forge/schema/types.ts'
import { FutureWrap } from '../../components/chips'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSessionState } from '../../session/SessionProvider'
import { RecoverBadges } from '../MainSheet/Resources'
import { TrackerTicks } from '../MainSheet/Ticks'
import { levelLabel } from './spellHelpers'

function SlotPoolRow({ pool }: { pool: SlotPool }) {
  const { trackers } = useSessionState()
  const used = trackers.slotPools?.[pool.id]?.used ?? 0
  const label = pool.name ?? `${levelLabel(pool.slotLevel)} slots`
  return (
    <li className="slot-pool">
      <div className="slot-pool__head">
        <span className="slot-pool__name">{label}</span>
        <RecoverBadges recover={pool.recover} />
      </div>
      <TrackerTicks kind="slotPool" id={pool.id} total={pool.count} used={used} label={`${label} slots`} />
      {pool.note && (
        <span className="slot-pool__note">
          <MarkupText source={pool.note} />
        </span>
      )}
    </li>
  )
}

/**
 * Slot tracker per pool (T10 IA): tappable pips grouped by pool, each with its
 * own recovery icon. Pools are grouped by `slotLevel` so pools that coexist at
 * one spell level with different recovery (pact SR vs shared LR vs bonus SR,
 * §2.8) read side by side. Build view grays not-yet-unlocked pool rows.
 */
export function SlotPoolsPanel() {
  const { character, viewMode, isVisible, isFuture } = useCharacter()
  const pools = character.spellcasting?.slotPools ?? []
  const visiblePools = pools.filter((p) => isVisible(p.unlockLevel))
  if (visiblePools.length === 0) return null

  const levels = Array.from(new Set(visiblePools.map((p) => p.slotLevel))).sort((a, b) => a - b)

  return (
    <section className="panel spell-slots" aria-label="Spell slots">
      <h2 className="panel__title">Slots</h2>
      {levels.map((level) => (
        <div key={level} className="spell-slots__level">
          <span className="spell-slots__level-label">{levelLabel(level)}</span>
          <ul className="slot-pool-list">
            {visiblePools
              .filter((p) => p.slotLevel === level)
              .map((pool) =>
                viewMode === 'build' && isFuture(pool.unlockLevel) ? (
                  <li key={pool.id} className="slot-pool slot-pool--future">
                    <FutureWrap level={pool.unlockLevel ?? 1}>
                      <SlotPoolRow pool={pool} />
                    </FutureWrap>
                  </li>
                ) : (
                  <SlotPoolRow key={pool.id} pool={pool} />
                ),
              )}
          </ul>
        </div>
      ))}
    </section>
  )
}

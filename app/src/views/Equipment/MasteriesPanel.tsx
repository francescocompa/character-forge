import type { PoolOption } from '@character-forge/schema/types.ts'
import { RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { maxCount } from '../MainSheet/Resources'

function MasteryOption({
  poolId,
  option,
  selected,
  atLimit,
}: {
  poolId: string
  option: PoolOption
  selected: boolean
  atLimit: boolean
}) {
  const store = useSession()
  const { openRef } = useLibrary()
  const name = option.displayName ?? option.name
  return (
    <li className={`mastery-option ${selected ? 'mastery-option--selected' : ''}`}>
      <label className="mastery-option__row">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selected && atLimit}
          onChange={() =>
            selected ? store.deselect(poolId, option.ref) : store.select(poolId, option.ref)
          }
        />
        <RefLink label={name} onClick={() => openRef(option.ref)} />
      </label>
      {option.summary && (
        <span className="mastery-option__summary">
          <MarkupText source={option.summary} />
        </span>
      )}
    </li>
  )
}

/**
 * Weapon masteries manage flow (2024 builds, T11 IA): mirrors T10's
 * prepare/manage mode — browse the pool's full option set, current session
 * selection highlighted, capped at `chooseCount` with a live counter, rest
 * rule shown as an informational note only (the app never blocks a swap).
 * Placed on Equipment rather than Main: masteries are a property of the
 * weapons themselves, alongside the rest of the gear list, and Main's
 * Attacks panel (T13) stays a clean at-a-glance table.
 */
export function MasteriesPanel() {
  const { character } = useCharacter()
  const { loadout } = useSessionState()
  const poolEntry = Object.entries(character.pools ?? {}).find(
    ([, p]) => p.kind === 'weaponMasteries',
  )
  if (!poolEntry) return null

  const [poolId, pool] = poolEntry
  const selected = loadout.pools?.[poolId]?.selected ?? []
  const limit = maxCount(pool.chooseCount, character.stats.proficiencyBonus)

  return (
    <section className="panel masteries" aria-label={`${pool.name} selection`}>
      <div className="masteries__head">
        <h2 className="panel__title">{pool.name}</h2>
        <span className="masteries__count">
          {selected.length}
          {limit !== null ? ` / ${limit}` : ''} selected
        </span>
      </div>
      <p className="masteries__note">
        Masteries normally change after a long rest — swap anytime; this app won&apos;t stop you.
      </p>
      <ul className="mastery-option-list">
        {pool.options.map((option) => (
          <MasteryOption
            key={option.ref}
            poolId={poolId}
            option={option}
            selected={selected.includes(option.ref)}
            atLimit={limit !== null && selected.length >= limit}
          />
        ))}
      </ul>
    </section>
  )
}

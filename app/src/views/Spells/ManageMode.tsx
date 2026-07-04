import type { PoolOption } from '@character-forge/schema/types.ts'
import { RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { maxCount } from '../MainSheet/Resources'
import { groupPoolOptionsByLevel, levelLabel } from './spellHelpers'

function ManageOption({
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
    <li className={`manage-option ${selected ? 'manage-option--selected' : ''}`}>
      <label className="manage-option__row">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selected && atLimit}
          onChange={() => (selected ? store.deselect(poolId, option.ref) : store.select(poolId, option.ref))}
        />
        <RefLink label={name} onClick={() => openRef(option.ref)} />
      </label>
      {option.summary && (
        <div className="manage-option__summary">
          <MarkupText source={option.summary} />
        </div>
      )}
    </li>
  )
}

/**
 * Prepare/manage mode (D13, T10 IA): for every source with a `preparedSpells`
 * pool, browse the *full* embedded pool (not just the currently-known
 * subset), grouped by level, with the current selection highlighted and
 * capped at the source's prepare-count. The rest-rule note is informational
 * only — the app never blocks a swap, matching every other tracker in v1.
 */
export function ManageMode() {
  const { character } = useCharacter()
  const { loadout } = useSessionState()
  const sources = character.spellcasting?.sources ?? []
  const spells = character.spellcasting?.spells ?? []
  const poolEntries = Object.entries(character.pools ?? {}).filter(([, p]) => p.kind === 'preparedSpells')

  if (poolEntries.length === 0) {
    return <p className="spells-empty">No preparable spells to manage.</p>
  }

  return (
    <div className="manage-mode">
      {poolEntries.map(([poolId, pool]) => {
        const source = sources.find((s) => s.id === pool.sourceId)
        const selected = loadout.pools?.[poolId]?.selected ?? []
        const limit = maxCount(pool.chooseCount, character.stats.proficiencyBonus)
        const groups = groupPoolOptionsByLevel(pool, spells)

        return (
          <section key={poolId} className="panel manage-source" aria-label={`${pool.name} selection`}>
            <div className="manage-source__head">
              <h2 className="panel__title">{pool.name}</h2>
              <span className="manage-source__count">
                {selected.length}
                {limit !== null ? ` / ${limit}` : ''} prepared
              </span>
            </div>
            {source?.prepareRule && (
              <p className="manage-source__rule">
                <MarkupText source={source.prepareRule} />
              </p>
            )}
            <p className="manage-source__note">
              Selections normally change after a long rest — swap anytime; this app won't stop you.
            </p>
            {groups.map((group) => (
              <div key={group.level ?? 'other'} className="manage-source__level">
                <span className="manage-source__level-label">{levelLabel(group.level)}</span>
                <ul className="manage-option-list">
                  {group.items.map((option) => (
                    <ManageOption
                      key={option.ref}
                      poolId={poolId}
                      option={option}
                      selected={selected.includes(option.ref)}
                      atLimit={limit !== null && selected.length >= limit}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

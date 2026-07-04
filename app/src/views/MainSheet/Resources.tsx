import type { RecoverModel, Resource } from '@character-forge/schema/types.ts'
import { RecoverIcon, type RecoverTrigger, FutureWrap } from '../../components/chips'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { Counter, TrackerTicks } from './Ticks'

const REST_ICON: Record<string, RecoverTrigger | undefined> = {
  long: 'LR',
  short: 'SR',
  dawn: 'Dawn',
}

/** Recovery icons for a resource/pool — one per rule, so mixed recovery reads at a glance. */
export function RecoverBadges({ recover }: { recover: RecoverModel }) {
  return (
    <span className="recover-badges">
      {recover.map((rule, i) => {
        const icon = REST_ICON[rule.on]
        const amount =
          rule.amount === 'all' ? '' : typeof rule.amount === 'number' ? `+${rule.amount}` : rule.amount
        return (
          <span key={i} className="recover-badge">
            {icon ? <RecoverIcon when={icon} /> : <span className="recover-badge__other">{rule.on}</span>}
            {amount && <span className="recover-badge__amount">{amount}</span>}
          </span>
        )
      })}
    </span>
  )
}

/** Resolve a resource `max` to a box count; a non-numeric formula renders as text only. */
export function maxCount(max: number | string, proficiencyBonus: number): number | null {
  if (typeof max === 'number') return max
  if (max.trim().toUpperCase() === 'PB') return proficiencyBonus
  return null
}

function ResourceRow({ resource }: { resource: Resource }) {
  const { character } = useCharacter()
  const { trackers } = useSessionState()
  const total = maxCount(resource.max, character.stats.proficiencyBonus)
  const used = trackers.resources?.[resource.id]?.used ?? 0
  return (
    <li className="resource">
      <div className="resource__head">
        <span className="resource__name">{resource.name}</span>
        <RecoverBadges recover={resource.recover} />
      </div>
      <div className="resource__track">
        {total !== null ? (
          <TrackerTicks
            kind="resource"
            id={resource.id}
            total={total}
            used={used}
            label={`${resource.name} uses`}
          />
        ) : (
          <span className="resource__formula">{resource.max}</span>
        )}
      </div>
      {resource.note && (
        <span className="resource__note">
          <MarkupText source={resource.note} />
        </span>
      )}
    </li>
  )
}

/** A consumable tally (ammunition etc.) with a ± counter. */
function ConsumableRow({ id, name, max }: { id: string; name: string; max?: number }) {
  const store = useSession()
  const { trackers } = useSessionState()
  const count = trackers.consumables?.[id]?.count ?? 0
  return (
    <li className="consumable">
      <span className="consumable__name">{name}</span>
      <Counter count={count} max={max} label={name} onDelta={(d) => store.adjustConsumable(id, d)} />
    </li>
  )
}

/**
 * Resource strip: every limited-use pool (MAX, recovery icons incl. mixed
 * recovery, interactive USED tick-boxes), consumable tallies, and rest controls.
 * Visibility follows the view mode; Build view grays future resources.
 */
export function ResourcesPanel() {
  const { character, viewMode, isVisible, isFuture } = useCharacter()
  const store = useSession()
  const resources = character.resources ?? []
  const consumables = character.consumables ?? []
  const visibleResources = resources.filter((r) => isVisible(r.unlockLevel))
  if (visibleResources.length === 0 && consumables.length === 0) return null

  return (
    <section className="panel resources" aria-label="Resources and rests">
      <div className="resources__toolbar">
        <h2 className="panel__title">Resources</h2>
        <div className="rest-buttons">
          <button type="button" className="rest-btn" onClick={() => store.applyShortRest()}>
            <RecoverIcon when="SR" /> Short rest
          </button>
          <button type="button" className="rest-btn" onClick={() => store.applyLongRest()}>
            <RecoverIcon when="LR" /> Long rest
          </button>
          <button type="button" className="rest-btn rest-btn--undo" onClick={() => store.undoLast()}>
            Undo
          </button>
        </div>
      </div>

      {visibleResources.length > 0 && (
        <ul className="resources__list">
          {visibleResources.map((resource) =>
            viewMode === 'build' && isFuture(resource.unlockLevel) ? (
              <li key={resource.id} className="resource resource--future">
                <FutureWrap level={resource.unlockLevel}>
                  <ResourceRow resource={resource} />
                </FutureWrap>
              </li>
            ) : (
              <ResourceRow key={resource.id} resource={resource} />
            ),
          )}
        </ul>
      )}

      {consumables.length > 0 && (
        <ul className="consumables__list">
          {consumables.map((c) => (
            <ConsumableRow key={c.id} id={c.id} name={c.name} max={c.max} />
          ))}
        </ul>
      )}
    </section>
  )
}

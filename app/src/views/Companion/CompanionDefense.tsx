import type { CompanionSheet } from '@character-forge/schema/types.ts'
import { useCharacter } from '../../character/CharacterProvider'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { NumberStepper, TrackerTicks } from '../MainSheet/Ticks'
import { RecoverBadges, maxCount } from '../MainSheet/Resources'

/**
 * AC, speeds (incl. alternate movement), and its own HP tracker + resource
 * ticks — namespaced under the companion's id in the SessionStore (T02's
 * `TrackerScope`) so it never collides with the main character's or another
 * companion's state. Death saves are out of scope for v1: the schema has no
 * per-companion death-save tracker yet (see T12 note in the changelog); no
 * fixture companion (familiar) needs them.
 */
export function CompanionDefense({ companion }: { companion: CompanionSheet }) {
  const { character } = useCharacter()
  const store = useSession()
  const { companions } = useSessionState()
  const scope = { owner: companion.id }
  const trackers = companions?.[companion.id]

  const maxHpNumeric = typeof companion.maxHp.value === 'number' ? companion.maxHp.value : undefined
  const current = trackers?.hp?.current ?? maxHpNumeric ?? 0
  const temp = trackers?.hp?.temp ?? 0

  return (
    <section className="panel defense" aria-label={`${companion.name} defense`}>
      <div className="defense__stats">
        <div className="stat stat--ac">
          <span className="stat__label">AC</span>
          <span className="stat__value">{companion.ac.value}</span>
        </div>
        <div className="stat stat--speeds">
          <span className="stat__label">Speed</span>
          <span className="stat__value">
            {companion.speeds.map((s, i) => (
              <span key={`${s.type}-${i}`} className="speed">
                {s.value} ft{s.type !== 'walk' && <span className="speed__type"> {s.type}</span>}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="hp-block">
        <div className="hp-block__main">
          <div className="hp-current">
            <span className="stat__label">Hit points</span>
            <div className="hp-current__row">
              <NumberStepper
                value={current}
                label={`${companion.name} current hit points`}
                onChange={(v) => store.setCurrentHp(v, scope)}
                min={0}
                max={maxHpNumeric}
              />
              <span className="hp-current__max">/ {companion.maxHp.value}</span>
            </div>
          </div>
          <div className="hp-temp">
            <span className="stat__label">Temp HP</span>
            <NumberStepper
              value={temp}
              label={`${companion.name} temporary hit points`}
              onChange={(v) => store.setTempHp(v, scope)}
              min={0}
            />
          </div>
        </div>
      </div>

      {companion.resources && companion.resources.length > 0 && (
        <div className="hit-dice" aria-label={`${companion.name} resources`}>
          <span className="stat__label">Resources</span>
          <ul className="resources__list">
            {companion.resources.map((resource) => {
              const total = maxCount(resource.max, character.stats.proficiencyBonus)
              const used = trackers?.resources?.[resource.id]?.used ?? 0
              return (
                <li key={resource.id} className="resource">
                  <div className="resource__head">
                    <span className="resource__name">{resource.name}</span>
                    <RecoverBadges recover={resource.recover} />
                  </div>
                  {total !== null ? (
                    <TrackerTicks
                      kind="resource"
                      id={resource.id}
                      total={total}
                      used={used}
                      label={`${resource.name} uses`}
                      scope={scope}
                    />
                  ) : (
                    <span className="resource__formula">{resource.max}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

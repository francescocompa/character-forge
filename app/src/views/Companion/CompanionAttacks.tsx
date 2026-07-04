import type { Attack, CompanionSheet } from '@character-forge/schema/types.ts'
import { SaveDCBadge } from '../../components/chips'
import { MarkupText } from '../../library'
import { signed } from '../MainSheet/format'

/** To-hit with a separable magic bonus (the circled +1, §2.8): base then magic part. */
function ToHit({ modifier, magicBonus }: { modifier: number; magicBonus?: number }) {
  if (magicBonus) {
    return (
      <span className="tohit">
        <span className="tohit__base">{signed(modifier - magicBonus)}</span>
        <span className="tohit__magic">{signed(magicBonus)} magic</span>
      </span>
    )
  }
  return <span className="tohit">{signed(modifier)}</span>
}

function AttackRow({ attack }: { attack: Attack }) {
  return (
    <li className="attack">
      <div className="attack__main">
        <span className="attack__name">{attack.displayName ?? attack.name}</span>
        <span className="attack__hit">
          {attack.save ? (
            <SaveDCBadge ability={attack.save.ability} dc={attack.save.dc} />
          ) : attack.toHit ? (
            <ToHit modifier={attack.toHit.modifier} magicBonus={attack.toHit.magicBonus} />
          ) : null}
        </span>
        {attack.range && <span className="attack__range">{attack.range}</span>}
        {attack.damage && (
          <span className="attack__dmg">
            <MarkupText source={attack.damage} />
          </span>
        )}
      </div>
      {attack.notes && (
        <div className="attack__notes">
          <MarkupText source={attack.notes} />
        </div>
      )}
      {attack.riders && attack.riders.length > 0 && (
        <ul className="attack__riders">
          {attack.riders.map((rider, i) => (
            <li key={i} className="rider">
              <span className="rider__name">{rider.name}</span>
              {rider.summary && (
                <span className="rider__summary">
                  <MarkupText source={rider.summary} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** Attacks table for one companion — same markup/damage/rider conventions as the main sheet. */
export function CompanionAttacks({ companion }: { companion: CompanionSheet }) {
  const attacks = companion.attacks ?? []
  if (attacks.length === 0) return null
  return (
    <section className="panel attacks" aria-label={`${companion.name} attacks`}>
      <h2 className="panel__title">Attacks</h2>
      <ul className="attacks__list">
        {attacks.map((attack, i) => (
          <AttackRow key={`${attack.name}-${i}`} attack={attack} />
        ))}
      </ul>
    </section>
  )
}

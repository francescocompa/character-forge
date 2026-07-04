import type { Attack } from '@character-forge/schema/types.ts'
import { SaveDCBadge, FutureWrap } from '../../components/chips'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { signed } from './format'

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
  const { character, nameOf } = useCharacter()
  const consumableName = attack.consumableRef
    ? character.consumables?.find((c) => c.id === attack.consumableRef)?.name
    : undefined
  return (
    <li className="attack">
      <div className="attack__main">
        <span className="attack__name">{attack.displayName ?? nameOf(attack.ref, attack.name)}</span>
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
        {consumableName && <span className="attack__ammo">uses {consumableName}</span>}
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

/** Attacks table: one row per weapon mode, with riders as secondary lines. */
export function AttacksPanel() {
  const { character, viewMode, isVisible, isFuture } = useCharacter()
  const attacks = (character.attacks ?? []).filter((a) => isVisible(a.unlockLevel))
  if (attacks.length === 0) return null
  return (
    <section className="panel attacks" aria-label="Attacks">
      <h2 className="panel__title">Attacks</h2>
      <ul className="attacks__list">
        {attacks.map((attack, i) =>
          viewMode === 'build' && isFuture(attack.unlockLevel) ? (
            <li key={`${attack.name}-${i}`} className="attack attack--future">
              <FutureWrap level={attack.unlockLevel ?? 1}>
                <AttackRow attack={attack} />
              </FutureWrap>
            </li>
          ) : (
            <AttackRow key={`${attack.name}-${i}`} attack={attack} />
          ),
        )}
      </ul>
    </section>
  )
}

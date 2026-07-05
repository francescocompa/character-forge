import type { Markup } from '@character-forge/schema/types.ts'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'

function ChipList({ title, items, tone }: { title: string; items?: Markup[]; tone: string }) {
  if (!items || items.length === 0) return null
  return (
    <div className={`defenses__group defenses__group--${tone}`}>
      <span className="defenses__label">{title}</span>
      <ul className="defenses__items">
        {items.map((item, i) => (
          <li key={i} className="defenses__item">
            <MarkupText source={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Resistances / immunities / vulnerabilities / condition-advantage chips (markup-rendered). */
export function DefensesBlock() {
  const { character } = useCharacter()
  const { resistances, immunities, vulnerabilities, conditionAdvantages } = character.stats
  const any =
    resistances?.length ||
    immunities?.length ||
    vulnerabilities?.length ||
    conditionAdvantages?.length
  if (!any) return null
  return (
    <section className="panel defenses" aria-label="Resistances and immunities">
      <h2 className="panel__title">Defenses</h2>
      <ChipList title="Resistances" items={resistances} tone="resist" />
      <ChipList title="Immunities" items={immunities} tone="immune" />
      <ChipList title="Vulnerabilities" items={vulnerabilities} tone="vuln" />
      <ChipList title="Condition advantage" items={conditionAdvantages} tone="cond" />
    </section>
  )
}

/** Senses, languages, and armor/weapon/tool proficiencies. */
export function SensesBlock() {
  const { character } = useCharacter()
  const { senses, languages, proficiencies } = character.stats
  const hasProf =
    proficiencies?.armor?.length || proficiencies?.weapons?.length || proficiencies?.tools?.length
  if (!senses?.length && !languages?.length && !hasProf) return null
  return (
    <section className="panel senses" aria-label="Senses, languages, and proficiencies">
      <h2 className="panel__title">Senses & proficiencies</h2>
      {senses && senses.length > 0 && (
        <div className="senses__group">
          <span className="senses__label">Senses</span>
          <ul className="senses__items">
            {senses.map((s, i) => (
              <li key={i}>
                <MarkupText source={s} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {languages && languages.length > 0 && (
        <div className="senses__group">
          <span className="senses__label">Languages</span>
          <span className="senses__value">{languages.join(', ')}</span>
        </div>
      )}
      {proficiencies?.armor && proficiencies.armor.length > 0 && (
        <div className="senses__group">
          <span className="senses__label">Armor</span>
          <span className="senses__value">{proficiencies.armor.join(', ')}</span>
        </div>
      )}
      {proficiencies?.weapons && proficiencies.weapons.length > 0 && (
        <div className="senses__group">
          <span className="senses__label">Weapons</span>
          <span className="senses__value">{proficiencies.weapons.join(', ')}</span>
        </div>
      )}
      {proficiencies?.tools && proficiencies.tools.length > 0 && (
        <div className="senses__group">
          <span className="senses__label">Tools</span>
          <span className="senses__value">{proficiencies.tools.join(', ')}</span>
        </div>
      )}
    </section>
  )
}

import type { CompanionSheet, Markup } from '@character-forge/schema/types.ts'
import { MarkupText } from '../../library'

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

/** Resistance/immunity/condition-advantage chips, senses, and languages. */
export function CompanionDefenses({ companion }: { companion: CompanionSheet }) {
  const { resistances, immunities, conditionAdvantages, senses, languages } = companion
  const any =
    resistances?.length ||
    immunities?.length ||
    conditionAdvantages?.length ||
    senses?.length ||
    languages?.length
  if (!any) return null
  return (
    <section className="panel defenses" aria-label={`${companion.name} defenses and senses`}>
      <h2 className="panel__title">Defenses & senses</h2>
      <ChipList title="Resistances" items={resistances} tone="resist" />
      <ChipList title="Immunities" items={immunities} tone="immune" />
      <ChipList title="Condition advantage" items={conditionAdvantages} tone="cond" />
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
    </section>
  )
}

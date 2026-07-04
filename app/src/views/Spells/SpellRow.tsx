import type { Spell, SpellSource } from '@character-forge/schema/types.ts'
import { FutureWrap, OriginDot, RefLink, SchoolLabel } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'

const ROLE_LABEL: Record<NonNullable<Spell['role']>, string> = {
  prepared: 'Prepared',
  alwaysPrepared: 'Always prepared',
  innate: 'Innate',
  known: 'Known',
  ritualOnly: 'Ritual only',
}

export interface SpellRowProps {
  spell: Spell
  /** `SpellSource.id` -> palette index (declaration order), shared across the view. */
  sourceIndex: ReadonlyMap<string, number>
  sources: readonly SpellSource[]
}

/** One or two origin ids -> a single origin dot, two-tone when the spell is dual-source (§2.8). */
function SpellOriginDot({ origins, sourceIndex, sources }: Omit<SpellRowProps, 'spell'> & { origins: string[] }) {
  const [firstId, secondId] = origins
  if (firstId === undefined) return null
  const nameOf = (id: string) => sources.find((s) => s.id === id)?.name ?? id
  const label = origins.map(nameOf).join(' + ')
  return (
    <OriginDot
      label={label}
      index={sourceIndex.get(firstId) ?? 0}
      secondaryIndex={secondId !== undefined ? sourceIndex.get(secondId) : undefined}
    />
  )
}

function SpellRowBody({ spell, sourceIndex, sources }: SpellRowProps) {
  const { openRef } = useLibrary()
  const name = spell.displayName ?? spell.name
  return (
    <div className="spell-row">
      <div className="spell-row__head">
        {spell.role && <span className="spell-row__role">{ROLE_LABEL[spell.role]}</span>}
        <span className="spell-row__title">
          {spell.ref ? <RefLink label={name} onClick={() => openRef(spell.ref!)} /> : name}
          <SpellOriginDot origins={spell.origins} sourceIndex={sourceIndex} sources={sources} />
        </span>
        <span className="spell-row__flags">
          {spell.concentration && (
            <span className="chip spell-flag" title="Concentration">
              C
            </span>
          )}
          {spell.ritual && (
            <span className="chip spell-flag" title="Ritual">
              R
            </span>
          )}
        </span>
        {spell.school && <SchoolLabel school={spell.school} />}
      </div>
      {spell.summary && (
        <div className="spell-row__summary">
          <MarkupText source={spell.summary} />
        </div>
      )}
    </div>
  )
}

/** One spell row: future-grayed + badged in Build view, plain otherwise (matches every other list in the app). */
export function SpellRow({ spell, sourceIndex, sources }: SpellRowProps) {
  const { viewMode, isFuture } = useCharacter()
  if (viewMode === 'build' && isFuture(spell.unlockLevel)) {
    return (
      <li className="spell-row-wrap spell-row-wrap--future">
        <FutureWrap level={spell.unlockLevel}>
          <SpellRowBody spell={spell} sourceIndex={sourceIndex} sources={sources} />
        </FutureWrap>
      </li>
    )
  }
  return (
    <li className="spell-row-wrap">
      <SpellRowBody spell={spell} sourceIndex={sourceIndex} sources={sources} />
    </li>
  )
}

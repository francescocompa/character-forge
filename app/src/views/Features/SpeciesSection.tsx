import { RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { CollapsibleSection } from './CollapsibleSection'
import { FeatureList } from './ProgressionRow'
import type { ProgressionItem } from '@character-forge/schema/types.ts'

/** "Autognome · AAG 2014" — same subtle source/edition tag the popover footer uses. */
function sourceTag(edition: string, source: string): string {
  if (edition === source) return edition
  return `${source} · ${edition}`
}

/**
 * Species section: reflavored displayName with the source entry named subtly,
 * the compiled speed line, reflavor modifications, and the classless-feature
 * traits list (§ group.ts convention).
 */
export function SpeciesSection({ traits }: { traits: ProgressionItem[] }) {
  const { character, nameOf } = useCharacter()
  const { openRef } = useLibrary()
  const { species } = character.chassis
  const entry = character.library[species.ref]
  const name = nameOf(species.ref, species.displayName)

  return (
    <CollapsibleSection
      title={
        <span className="chassis-section__heading">
          <RefLink label={name} onClick={() => openRef(species.ref)} />
          {entry && <span className="chassis-section__source">{sourceTag(entry.edition, entry.source)}</span>}
        </span>
      }
      className="chassis-section"
    >
      {character.stats.speeds.length > 0 && (
        <p className="chassis-section__speeds">
          {character.stats.speeds.map((speed, i) => (
            <span key={i} className="speed">
              <span className="speed__type">{speed.type}</span> {speed.value} ft
            </span>
          ))}
        </p>
      )}
      {species.modifications && species.modifications.length > 0 && (
        <ul className="chassis-section__mods">
          {species.modifications.map((mod, i) => (
            <li key={i}>
              <MarkupText source={mod.note} />
            </li>
          ))}
        </ul>
      )}
      <FeatureList items={traits} />
    </CollapsibleSection>
  )
}

import type { ProgressionItem } from '@character-forge/schema/types.ts'
import { RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { CollapsibleSection } from './CollapsibleSection'

function sourceTag(edition: string, source: string): string {
  if (edition === source) return edition
  return `${source} · ${edition}`
}

/**
 * Background section: name, the tool proficiencies it grants (the compiled
 * `stats.proficiencies.tools` — a background is the only source of tool
 * proficiency in this build), and a link to its feat (full detail lives in
 * the Feats section — only backgrounds and class ASI choices grant feats, and
 * ASI choices are always classRef-tagged, so a classless `kind: 'feat'` item
 * is unambiguously the background's feat).
 */
export function BackgroundSection({ backgroundFeat }: { backgroundFeat: ProgressionItem[] }) {
  const { character, nameOf, isVisible } = useCharacter()
  const { openRef } = useLibrary()
  const { background } = character.chassis
  const entry = character.library[background.ref]
  const name = nameOf(background.ref, background.displayName)
  const tools = character.stats.proficiencies?.tools ?? []

  return (
    <CollapsibleSection
      title={
        <span className="chassis-section__heading">
          <RefLink label={name} onClick={() => openRef(background.ref)} />
          {entry && <span className="chassis-section__source">{sourceTag(entry.edition, entry.source)}</span>}
        </span>
      }
      className="chassis-section"
    >
      {tools.length > 0 && (
        <p className="chassis-section__tools">
          <span className="chassis-section__label">Tools</span> {tools.join(', ')}
        </p>
      )}
      {background.modifications && background.modifications.length > 0 && (
        <ul className="chassis-section__mods">
          {background.modifications.map((mod, i) => (
            <li key={i}>
              <MarkupText source={mod.note} />
            </li>
          ))}
        </ul>
      )}
      {backgroundFeat.filter((feat) => isVisible(feat.unlockLevel)).map((feat) => (
        <p key={feat.ref ?? feat.name} className="chassis-section__feat-link">
          <span className="chassis-section__label">Feat</span>{' '}
          {feat.ref ? (
            <RefLink label={feat.displayName ?? feat.name} onClick={() => openRef(feat.ref!)} />
          ) : (
            feat.displayName ?? feat.name
          )}
        </p>
      ))}
    </CollapsibleSection>
  )
}

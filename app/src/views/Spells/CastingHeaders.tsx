import { AbilityChip, SaveDCBadge } from '../../components/chips'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { signed } from '../MainSheet/format'

/**
 * Casting header, one per `spellcasting.sources[]` (T10 IA): source name,
 * ability, save DC, attack mod, and its prepare rule. A single-source
 * character renders one compact header; multiclass/feat sources (Shigen
 * canon §2.8) each get their own. `SpellSource` carries no `unlockLevel` —
 * a source only exists once its granting class/feat is compiled in, so
 * there's no future state to gray here (unlike slot pools and spells).
 */
export function CastingHeaders() {
  const { character } = useCharacter()
  const sources = character.spellcasting?.sources ?? []
  if (sources.length === 0) return null

  return (
    <ul className="casting-headers">
      {sources.map((source) => (
        <li key={source.id} className="casting-header">
          <span className="casting-header__name">{source.name}</span>
          <AbilityChip ability={source.ability} />
          <SaveDCBadge ability={source.ability} dc={source.saveDc} />
          <span className="casting-header__atk">Atk {signed(source.attackMod)}</span>
          {source.prepareRule && (
            <span className="casting-header__rule">
              <MarkupText source={source.prepareRule} />
            </span>
          )}
          {source.note && (
            <p className="casting-header__note">
              <MarkupText source={source.note} />
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

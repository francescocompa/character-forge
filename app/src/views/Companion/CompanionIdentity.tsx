import type { CompanionSheet } from '@character-forge/schema/types.ts'
import { RefLink } from '../../components/chips'
import { useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'

/**
 * Name, portrait (if present), and a type/size line resolved from the
 * companion's library `ref` (e.g. "Tiresia (Imp familiar)") — the schema has
 * no separate type/size field, so the library entry's own name doubles as
 * that line and as the popover trigger for the full stat block.
 */
export function CompanionIdentity({ companion }: { companion: CompanionSheet }) {
  const { nameOf } = useCharacter()
  const { openRef } = useLibrary()
  const typeLabel = companion.ref ? nameOf(companion.ref) : undefined

  return (
    <header className="companion-identity">
      {companion.portrait && (
        <img className="companion-identity__portrait" src={companion.portrait} alt="" />
      )}
      <div className="companion-identity__text">
        <h2 className="companion-identity__name">{companion.name}</h2>
        {typeLabel && typeLabel !== companion.name && (
          <span className="companion-identity__type">
            {companion.ref ? (
              <RefLink label={typeLabel} onClick={() => openRef(companion.ref!)} />
            ) : (
              typeLabel
            )}
          </span>
        )}
      </div>
    </header>
  )
}

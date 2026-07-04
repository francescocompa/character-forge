import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { attunedItems } from './equipmentHelpers'

/**
 * Attunement slots (T11 IA): N slots, filled ones named. Read-only from the
 * compiled file — the T02 `SessionStore` contract has no attunement toggle in
 * v1 (only `equipped`/`carried`), so there's nothing to make interactive yet.
 */
export function AttunementPanel() {
  const { character } = useCharacter()
  const attunement = character.equipment?.attunement
  if (!attunement) return null

  const attuned = attunedItems(character.equipment?.items ?? [])
  const slots = Array.from({ length: attunement.max }, (_, i) => attuned[i])

  return (
    <section className="panel attunement" aria-label="Attunement">
      <h2 className="panel__title">Attunement</h2>
      <ul className="attunement__slots">
        {slots.map((item, i) => (
          <li key={i} className={`attunement-slot ${item ? 'is-filled' : ''}`}>
            {item ? item.name : <span className="attunement-slot__empty">Empty</span>}
          </li>
        ))}
      </ul>
      {attunement.note && (
        <span className="attunement__note">
          <MarkupText source={attunement.note} />
        </span>
      )}
    </section>
  )
}

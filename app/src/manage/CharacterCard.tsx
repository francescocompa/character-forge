import type { CharacterGroup } from './group'
import { classLine } from './about'

/**
 * One library card (T16): portrait thumb, display name, class + level, and a
 * variant count when a character has more than one build. The whole card opens
 * the character; the Manage button (rename / delete / about) opens the manage
 * dialog without opening the sheet.
 */
export function CharacterCard({
  group,
  onOpen,
  onManage,
}: {
  group: CharacterGroup
  onOpen: () => void
  onManage: () => void
}) {
  const primary = group.variants[0].character
  const portrait = primary.meta.portrait
  const monogram = group.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="cf-card">
      <button type="button" className="cf-card__open" onClick={onOpen}>
        <span className="cf-card__thumb" aria-hidden="true">
          {portrait ? <img src={portrait} alt="" className="cf-card__img" /> : monogram}
        </span>
        <span className="cf-card__body">
          <span className="cf-card__name">{group.name}</span>
          <span className="cf-card__class">{classLine(primary)}</span>
          {group.variants.length > 1 && (
            <span className="cf-card__variants">{group.variants.length} variants</span>
          )}
        </span>
      </button>
      <button
        type="button"
        className="cf-card__manage"
        aria-label={`Manage ${group.name}`}
        onClick={onManage}
      >
        Manage
      </button>
    </div>
  )
}

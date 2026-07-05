import { useEffect, useId, useState } from 'react'
import { useCharacterLibrary } from './CharacterLibraryProvider'
import type { CharacterGroup } from './group'
import { characterAbout, classLine } from './about'
import type { StoredCharacter } from '../state/characterDb'

/**
 * Manage a character (T16 deliverable 3): rename its display alias (leaves the
 * file untouched), inspect each variant's "about" facts, and delete a variant
 * (with its session state). Delete is per-variant so removing one leaves the
 * others intact; deleting the last variant empties the card.
 */
export function ManageDialog({ group, onClose }: { group: CharacterGroup; onClose: () => void }) {
  const { renameCharacter, removeVariant } = useCharacterLibrary()
  const titleId = useId()
  const [alias, setAlias] = useState(group.alias ?? '')
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const fileName = group.variants[0]?.character.meta.name ?? group.name
  const aliasChanged = (alias.trim() || undefined) !== group.alias

  const saveAlias = () => {
    void renameCharacter(group.characterId, alias)
  }

  const remove = (record: StoredCharacter) => {
    void removeVariant(record.key).then(() => {
      // Last variant gone → the card no longer exists; close the dialog.
      if (group.variants.length <= 1) onClose()
      else setConfirmKey(null)
    })
  }

  return (
    <div className="mng-overlay" role="presentation" onClick={onClose}>
      <div
        className="mng-dialog mng-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mng-dialog__head">
          <h2 id={titleId} className="mng-dialog__title">
            Manage character
          </h2>
          <button type="button" className="mng-dialog__close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className="mng-field">
          <span className="mng-field__label">Display name</span>
          <div className="mng-field__row">
            <input
              className="mng-input"
              type="text"
              value={alias}
              placeholder={fileName}
              onChange={(e) => setAlias(e.target.value)}
            />
            <button
              type="button"
              className="mng-btn mng-btn--primary"
              disabled={!aliasChanged}
              onClick={saveAlias}
            >
              Save
            </button>
          </div>
          <span className="mng-field__hint">
            A nickname for your library. The file's own name is “{fileName}”.
          </span>
        </label>

        <div className="mng-variants">
          <span className="mng-field__label">
            {group.variants.length > 1 ? 'Variants' : 'This file'}
          </span>
          <ul className="mng-variant-list">
            {group.variants.map((record) => {
              const about = characterAbout(record.character)
              return (
                <li key={record.key} className="mng-variant">
                  <div className="mng-variant__main">
                    <span className="mng-variant__label">
                      {record.variantLabel ?? record.character.meta.name}
                    </span>
                    <span className="mng-variant__class">{classLine(record.character)}</span>
                    <span className="mng-variant__about">
                      Format v{about.formatVersion}
                      {about.compiledAt ? ` · compiled ${about.compiledAt}` : ''} ·{' '}
                      {about.libraryEntries} library entries · {about.spells} spells
                    </span>
                  </div>
                  {confirmKey === record.key ? (
                    <div className="mng-variant__confirm">
                      <span>Delete for good?</span>
                      <button
                        type="button"
                        className="mng-btn mng-btn--danger"
                        onClick={() => remove(record)}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="mng-btn mng-btn--ghost"
                        onClick={() => setConfirmKey(null)}
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mng-btn mng-btn--ghost mng-variant__delete"
                      onClick={() => setConfirmKey(record.key)}
                    >
                      Delete
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

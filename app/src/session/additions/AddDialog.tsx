import { useEffect, useId, useState } from 'react'
import type { Addition } from '@character-forge/schema/types.ts'
import { parseMarkup } from '@character-forge/schema/markup.ts'
import { SheetMarkup } from '../../markup/SheetMarkup'
import { RecoverIcon, type RecoverTrigger } from '../../components/chips'
import { useSession } from '../SessionProvider'
import {
  type AdditionDraft,
  type AdditionKind,
  type BoonRecover,
  draftFromAddition,
  draftIsValid,
  draftToAddition,
  emptyDraft,
} from './additionDraft'
import './additions.css'

const KINDS: { id: AdditionKind; label: string }[] = [
  { id: 'item', label: 'Item' },
  { id: 'boon', label: 'Boon' },
  { id: 'note', label: 'Note' },
]

const RECOVER: { id: BoonRecover; label: string; icon: RecoverTrigger }[] = [
  { id: 'long', label: 'Long rest', icon: 'LR' },
  { id: 'short', label: 'Short rest', icon: 'SR' },
  { id: 'dawn', label: 'Dawn', icon: 'Dawn' },
]

export interface AddDialogProps {
  /** Present = edit that addition; absent = add a new one. */
  editing?: Addition
  /** Kind the form opens on when adding (ignored in edit mode). */
  initialKind?: AdditionKind
  onClose: () => void
}

/** Live preview of a markup summary, with a gentle note if the parser flags it. */
function MarkupPreview({ source }: { source: string }) {
  if (source.trim() === '') return null
  const { diagnostics } = parseMarkup(source)
  const problem = diagnostics.find((d) => d.severity === 'error')
  return (
    <div className="add-preview">
      <span className="add-preview__label">Preview</span>
      <div className="add-preview__body">
        <SheetMarkup source={source} />
      </div>
      {problem && (
        <span className="add-preview__warn" role="status">
          Markup looks off ({problem.message}); it'll be saved as plain text.
        </span>
      )}
    </div>
  )
}

/**
 * The add / edit form for in-session additions (T15): a bottom-sheet modal with
 * a kind switch, kind-specific fields, and a live markup preview. Writes through
 * the {@link SessionStore}; editing reuses the same surface. Built for one-handed
 * use at 375 px — full-width controls, a sticky action bar at the thumb.
 */
export function AddDialog({ editing, initialKind = 'item', onClose }: AddDialogProps) {
  const store = useSession()
  const titleId = useId()
  const [draft, setDraft] = useState<AdditionDraft>(() =>
    editing ? draftFromAddition(editing) : emptyDraft(initialKind),
  )

  // Escape closes; the backdrop click does too (handled on the overlay).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = <K extends keyof AdditionDraft>(key: K, value: AdditionDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const canSave = draftIsValid(draft)
  const save = () => {
    if (!canSave) return
    const payload = draftToAddition(draft)
    if (editing) store.updateAddition(editing.id, payload)
    else store.addAddition(payload)
    onClose()
  }

  const summaryLabel =
    draft.kind === 'note'
      ? 'Note'
      : draft.kind === 'item'
        ? 'Note (optional)'
        : 'What it does (optional)'

  return (
    <div className="add-overlay" role="presentation" onClick={onClose}>
      <div
        className="add-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-sheet__head">
          <h2 id={titleId} className="add-sheet__title">
            {editing ? 'Edit addition' : 'Add to sheet'}
          </h2>
          <button type="button" className="add-sheet__close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        {!editing && (
          <div className="add-kinds" role="group" aria-label="Kind">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`add-kind ${draft.kind === k.id ? 'is-active' : ''}`}
                aria-pressed={draft.kind === k.id}
                onClick={() => set('kind', k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
        )}

        <div className="add-fields">
          {draft.kind !== 'note' && (
            <label className="add-field">
              <span className="add-field__label">Name</span>
              <input
                className="add-input"
                type="text"
                value={draft.name}
                autoFocus
                placeholder={
                  draft.kind === 'item'
                    ? 'e.g. Potion of healing'
                    : 'e.g. Blessing of the Archivist'
                }
                onChange={(e) => set('name', e.target.value)}
              />
            </label>
          )}

          {draft.kind === 'item' && (
            <div className="add-row">
              <label className="add-field add-field--narrow">
                <span className="add-field__label">Qty</span>
                <input
                  className="add-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={draft.quantity}
                  placeholder="1"
                  onChange={(e) => set('quantity', e.target.value)}
                />
              </label>
              <label className="add-field add-field--narrow">
                <span className="add-field__label">Weight (lb)</span>
                <input
                  className="add-input"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={draft.weightLb}
                  placeholder="—"
                  onChange={(e) => set('weightLb', e.target.value)}
                />
              </label>
            </div>
          )}

          <label className="add-field">
            <span className="add-field__label">{summaryLabel}</span>
            <textarea
              className="add-input add-textarea"
              rows={draft.kind === 'note' ? 4 : 3}
              value={draft.summary}
              autoFocus={draft.kind === 'note'}
              placeholder={
                draft.kind === 'note'
                  ? 'Anything worth remembering…'
                  : 'Supports sheet-markup, e.g. {dmg:radiant|1d4} or {save:WIS|13}'
              }
              onChange={(e) => set('summary', e.target.value)}
            />
          </label>

          {draft.kind === 'boon' && (
            <div className="add-limited">
              <label className="add-check">
                <input
                  type="checkbox"
                  checked={draft.limited}
                  onChange={(e) => set('limited', e.target.checked)}
                />
                Track limited uses
              </label>
              {draft.limited && (
                <div className="add-row">
                  <label className="add-field add-field--narrow">
                    <span className="add-field__label">Uses</span>
                    <input
                      className="add-input"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={draft.uses}
                      placeholder="1"
                      onChange={(e) => set('uses', e.target.value)}
                    />
                  </label>
                  <div className="add-field">
                    <span className="add-field__label">Recovers on</span>
                    <div className="add-recover" role="group" aria-label="Recovers on">
                      {RECOVER.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={`add-recover__btn ${draft.recover === r.id ? 'is-active' : ''}`}
                          aria-pressed={draft.recover === r.id}
                          onClick={() => set('recover', r.id)}
                        >
                          <RecoverIcon when={r.icon} /> {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(draft.kind !== 'item' || draft.summary.trim() !== '') && (
            <MarkupPreview source={draft.summary} />
          )}
        </div>

        <div className="add-actions">
          <button type="button" className="add-btn add-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="add-btn add-btn--primary"
            disabled={!canSave}
            onClick={save}
          >
            {editing ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

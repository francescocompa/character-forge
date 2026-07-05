import { useEffect, useId } from 'react'
import type { ImportDialogState } from './useCharacterImport'

/**
 * Renders the outcome of an import that needs the user (T16): a readable list of
 * validation problems, a clear "update the app" refusal for a too-new file, or a
 * refresh confirmation showing exactly what changes before we overwrite. The
 * happy paths (new character / new variant) never reach here — they commit
 * silently.
 */
export interface ImportDialogProps {
  state: NonNullable<ImportDialogState>
  onConfirm: () => void
  onDismiss: () => void
  busy: boolean
}

export function ImportDialog({ state, onConfirm, onDismiss, busy }: ImportDialogProps) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return (
    <div className="mng-overlay" role="presentation" onClick={onDismiss}>
      <div
        className="mng-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {state.kind === 'invalid' && <InvalidBody titleId={titleId} state={state} />}
        {state.kind === 'unsupported' && <UnsupportedBody titleId={titleId} state={state} />}
        {state.kind === 'refresh' && <RefreshBody titleId={titleId} state={state} />}

        <div className="mng-actions">
          <button type="button" className="mng-btn mng-btn--ghost" onClick={onDismiss}>
            {state.kind === 'refresh' ? 'Cancel' : 'Close'}
          </button>
          {state.kind === 'refresh' && (
            <button
              type="button"
              className="mng-btn mng-btn--primary"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? 'Updating…' : 'Update character'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InvalidBody({
  titleId,
  state,
}: {
  titleId: string
  state: Extract<ImportDialogState, { kind: 'invalid' }>
}) {
  const errors = state.issues.filter((i) => i.severity === 'error')
  return (
    <>
      <h2 id={titleId} className="mng-dialog__title">
        Couldn't import this file
      </h2>
      <p className="mng-dialog__lede">
        <span className="mng-filename">{state.fileName}</span> isn't a valid character file.
      </p>
      <ul className="mng-issues">
        {errors.slice(0, 8).map((issue, i) => (
          <li key={i} className="mng-issue">
            <code className="mng-issue__path">{issue.path}</code>
            <span className="mng-issue__msg">{issue.message}</span>
          </li>
        ))}
      </ul>
      {errors.length > 8 && (
        <p className="mng-dialog__note">…and {errors.length - 8} more problem(s).</p>
      )}
    </>
  )
}

function UnsupportedBody({
  titleId,
  state,
}: {
  titleId: string
  state: Extract<ImportDialogState, { kind: 'unsupported' }>
}) {
  return (
    <>
      <h2 id={titleId} className="mng-dialog__title">
        Update the app to open this
      </h2>
      <p className="mng-dialog__lede">
        <span className="mng-filename">{state.fileName}</span> was made with a newer character
        format (version {state.version}). This app understands up to version {state.supported}.
      </p>
      <p className="mng-dialog__note">
        Update character-forge to the latest version, then import the file again.
      </p>
    </>
  )
}

function RefreshBody({
  titleId,
  state,
}: {
  titleId: string
  state: Extract<ImportDialogState, { kind: 'refresh' }>
}) {
  const { change } = state
  const rows: { label: string; from: string; to: string }[] = []
  if (change.nameFrom !== change.nameTo)
    rows.push({ label: 'Name', from: change.nameFrom, to: change.nameTo })
  if (change.levelFrom !== change.levelTo)
    rows.push({ label: 'Level', from: String(change.levelFrom), to: String(change.levelTo) })
  if (change.formatVersionFrom !== change.formatVersionTo)
    rows.push({
      label: 'Format',
      from: `v${change.formatVersionFrom}`,
      to: `v${change.formatVersionTo}`,
    })

  return (
    <>
      <h2 id={titleId} className="mng-dialog__title">
        Refresh this character?
      </h2>
      <p className="mng-dialog__lede">
        You already have <strong>{change.nameTo}</strong>
        {state.character.meta.variantLabel ? ` (${state.character.meta.variantLabel})` : ''}.
        Importing <span className="mng-filename">{state.fileName}</span> replaces the build. Your
        play state — HP, uses, additions — is kept.
      </p>
      {rows.length > 0 ? (
        <ul className="mng-changes">
          {rows.map((r) => (
            <li key={r.label} className="mng-change">
              <span className="mng-change__label">{r.label}</span>
              <span className="mng-change__from">{r.from}</span>
              <span className="mng-change__arrow" aria-hidden="true">
                →
              </span>
              <span className="mng-change__to">{r.to}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mng-dialog__note">
          No changes to name, level, or format — the build content is updated.
        </p>
      )}
    </>
  )
}

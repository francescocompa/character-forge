import type { Addition, RecoverRule } from '@character-forge/schema/types.ts'

/**
 * The add/edit form's working state, and the pure mapping from it to an
 * {@link Addition} payload (T15). Kept separate from the dialog component so the
 * kind-specific field-stripping rules have one tested home: an item never
 * carries `limitedUse`, a note never carries `quantity`, and so on.
 */

export type AdditionKind = Addition['kind']

/** A boon's in-session recovery — one rule is plenty; mixed recovery is compiler territory. */
export type BoonRecover = 'long' | 'short' | 'dawn'

export interface AdditionDraft {
  kind: AdditionKind
  name: string
  summary: string
  /** Item only. Empty string = default 1. */
  quantity: string
  /** Item only. Empty string = no weight. */
  weightLb: string
  /** Boon only: does the boon have tracked uses? */
  limited: boolean
  /** Boon only. Empty string = default 1. */
  uses: string
  /** Boon only: when the uses recover. */
  recover: BoonRecover
}

export function emptyDraft(kind: AdditionKind = 'item'): AdditionDraft {
  return { kind, name: '', summary: '', quantity: '', weightLb: '', limited: false, uses: '', recover: 'long' }
}

/** Reconstruct the form state from an existing addition (edit mode). */
export function draftFromAddition(addition: Addition): AdditionDraft {
  const rule = addition.limitedUse?.recover[0]
  const recover: BoonRecover =
    rule?.on === 'short' || rule?.on === 'dawn' ? rule.on : 'long'
  return {
    kind: addition.kind,
    name: addition.name,
    summary: addition.summary ?? '',
    quantity: addition.quantity !== undefined ? String(addition.quantity) : '',
    weightLb: addition.weightLb !== undefined ? String(addition.weightLb) : '',
    limited: addition.limitedUse !== undefined,
    uses: addition.limitedUse ? String(addition.limitedUse.max) : '',
    recover,
  }
}

/** A positive integer from a form string, or `undefined` if blank/invalid. */
function toPositiveInt(value: string): number | undefined {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n > 0 ? n : undefined
}

/** A non-negative number from a form string, or `undefined` if blank/invalid. */
function toNonNegative(value: string): number | undefined {
  const n = Number(value)
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Is there enough to save? (A note needs a body; item/boon need a name.) */
export function draftIsValid(draft: AdditionDraft): boolean {
  return draft.kind === 'note' ? draft.summary.trim() !== '' : draft.name.trim() !== ''
}

/**
 * Map the form to an {@link Addition} payload, keeping only the fields that
 * belong to the chosen kind. Invalid markup in `summary` is preserved verbatim
 * (the renderer degrades it to plain text — acceptance: "can still be saved as
 * plain text").
 */
export function draftToAddition(draft: AdditionDraft): Omit<Addition, 'id' | 'addedAt'> {
  const summary = draft.summary.trim()
  if (draft.kind === 'note') {
    // A note's body lives in `summary`; its name is a short derived preview so
    // lists have something to show without a separate title field.
    const firstLine = summary.split('\n', 1)[0]
    const name = firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine
    return { kind: 'note', name: name || 'Note', summary }
  }
  if (draft.kind === 'item') {
    const quantity = toPositiveInt(draft.quantity) ?? 1
    const weightLb = toNonNegative(draft.weightLb)
    return {
      kind: 'item',
      name: draft.name.trim(),
      ...(summary ? { summary } : {}),
      quantity,
      ...(weightLb !== undefined ? { weightLb } : {}),
    }
  }
  // boon
  const limitedUse = draft.limited
    ? { max: toPositiveInt(draft.uses) ?? 1, recover: [{ on: draft.recover, amount: 'all' } as RecoverRule] }
    : undefined
  return {
    kind: 'boon',
    name: draft.name.trim(),
    ...(summary ? { summary } : {}),
    ...(limitedUse ? { limitedUse } : {}),
  }
}

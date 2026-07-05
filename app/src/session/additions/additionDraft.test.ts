import { describe, expect, it } from 'vitest'
import { draftFromAddition, draftIsValid, draftToAddition, emptyDraft } from './additionDraft'

describe('draftToAddition — kind-specific field stripping', () => {
  it('an item keeps quantity/weight/note and never carries limitedUse', () => {
    const out = draftToAddition({
      ...emptyDraft('item'),
      name: '  Potion of healing ',
      quantity: '3',
      weightLb: '0.5',
      summary: 'Regain {dmg:radiant|2d4}+2',
      // boon fields set but must be ignored for an item:
      limited: true,
      uses: '5',
    })
    expect(out).toEqual({
      kind: 'item',
      name: 'Potion of healing',
      quantity: 3,
      weightLb: 0.5,
      summary: 'Regain {dmg:radiant|2d4}+2',
    })
    expect('limitedUse' in out).toBe(false)
  })

  it('an item defaults quantity to 1 and omits weight when blank/invalid', () => {
    const out = draftToAddition({
      ...emptyDraft('item'),
      name: 'Torch',
      quantity: '',
      weightLb: 'x',
    })
    expect(out).toEqual({ kind: 'item', name: 'Torch', quantity: 1 })
  })

  it('a boon with limited uses carries a single recover rule; without, none', () => {
    const withUses = draftToAddition({
      ...emptyDraft('boon'),
      name: 'Second wind of the tide',
      limited: true,
      uses: '2',
      recover: 'short',
    })
    expect(withUses).toEqual({
      kind: 'boon',
      name: 'Second wind of the tide',
      limitedUse: { max: 2, recover: [{ on: 'short', amount: 'all' }] },
    })

    const noUses = draftToAddition({ ...emptyDraft('boon'), name: 'Passive ward', limited: false })
    expect('limitedUse' in noUses).toBe(false)
  })

  it('a note stores its body in summary and derives a short name', () => {
    const out = draftToAddition({
      ...emptyDraft('note'),
      summary: 'The bridge is trapped near the far side.',
    })
    expect(out.kind).toBe('note')
    expect(out.summary).toBe('The bridge is trapped near the far side.')
    expect(out.name).toBe('The bridge is trapped near the far side.')
  })

  it('a long note name is truncated with an ellipsis', () => {
    const long = 'x'.repeat(80)
    const out = draftToAddition({ ...emptyDraft('note'), summary: long })
    expect(out.name.length).toBe(58) // 57 chars + ellipsis
    expect(out.name.endsWith('…')).toBe(true)
  })
})

describe('draftIsValid', () => {
  it('requires a name for item/boon and a body for a note', () => {
    expect(draftIsValid({ ...emptyDraft('item'), name: '' })).toBe(false)
    expect(draftIsValid({ ...emptyDraft('item'), name: 'Rope' })).toBe(true)
    expect(draftIsValid({ ...emptyDraft('note'), summary: '' })).toBe(false)
    expect(draftIsValid({ ...emptyDraft('note'), summary: 'remember this' })).toBe(true)
  })
})

describe('draftFromAddition — round-trip for editing', () => {
  it('rebuilds the form from a limited-use boon', () => {
    const draft = draftFromAddition({
      id: 'add-1',
      kind: 'boon',
      name: 'Blessing',
      summary: 'do a thing',
      limitedUse: { max: 3, recover: [{ on: 'dawn', amount: 'all' }] },
      addedAt: '2026-07-05T00:00:00.000Z',
    })
    expect(draft).toMatchObject({
      kind: 'boon',
      name: 'Blessing',
      limited: true,
      uses: '3',
      recover: 'dawn',
    })
  })

  it('re-serializing an edited draft preserves the limited-use shape', () => {
    const original = {
      id: 'add-1',
      kind: 'item' as const,
      name: 'Lantern',
      quantity: 2,
      weightLb: 2,
      addedAt: '2026-07-05T00:00:00.000Z',
    }
    expect(draftToAddition(draftFromAddition(original))).toEqual({
      kind: 'item',
      name: 'Lantern',
      quantity: 2,
      weightLb: 2,
    })
  })
})

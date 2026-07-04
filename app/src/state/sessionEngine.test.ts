import { describe, expect, it } from 'vitest'
import type { CharacterFile, SessionFile } from '@character-forge/schema/types.ts'
import fixture from '../../../fixtures/synthetic.character.json'
import { createSessionEngine, reconcileSessionState, seedSessionState } from './sessionEngine'

const character = fixture as unknown as CharacterFile

function store() {
  return createSessionEngine(character, seedSessionState(character))
}

describe('seedSessionState', () => {
  it('seeds HP to max, consumables to max, loadout from pool defaults, currency from equipment', () => {
    const s = store().getState()
    expect(s.trackers.hp).toEqual({ current: 24, temp: 0 })
    expect(s.trackers.consumables?.arrows).toEqual({ count: 20 })
    expect(s.loadout.pools?.['wizard-prepared']?.selected).toEqual(['mending-charm', 'ashen-bolt'])
    expect(s.trackers.currency).toEqual({ gp: 32, sp: 5 })
  })
})

describe('ticks clamp against the file maxes', () => {
  it('a resource tick clamps at its max and untick at zero', () => {
    const s = store()
    s.tick('resource', 'second-wind')
    s.tick('resource', 'second-wind')
    s.tick('resource', 'second-wind') // max is 2 → clamps
    expect(s.getState().trackers.resources?.['second-wind']?.used).toBe(2)
    s.untick('resource', 'second-wind')
    s.untick('resource', 'second-wind')
    s.untick('resource', 'second-wind') // clamps at 0
    expect(s.getState().trackers.resources?.['second-wind']?.used).toBe(0)
  })

  it('a slot-pool tick clamps at count', () => {
    const s = store()
    for (let i = 0; i < 5; i++) s.tick('slotPool', 'wizard-1') // count is 3
    expect(s.getState().trackers.slotPools?.['wizard-1']?.used).toBe(3)
  })

  it('resolves a "PB" resource max when clamping', () => {
    const s = store()
    s.tick('resource', 'arcane-recovery')
    s.tick('resource', 'arcane-recovery') // max 1 → clamps
    expect(s.getState().trackers.resources?.['arcane-recovery']?.used).toBe(1)
  })
})

describe('rests apply per-rule recovery (mixed recovery)', () => {
  it('short rest regains 1 use of Second Wind and fully restores the short-rest slot', () => {
    const s = store()
    s.tick('resource', 'second-wind')
    s.tick('resource', 'second-wind') // used 2
    s.tick('slotPool', 'arcane-font-1') // short-rest slot, used 1
    s.applyShortRest()
    expect(s.getState().trackers.resources?.['second-wind']?.used).toBe(1) // +1 on SR
    expect(s.getState().trackers.slotPools?.['arcane-font-1']?.used).toBe(0) // all on SR
  })

  it('long rest fully restores resources, HP, and clears death saves', () => {
    const s = store()
    s.tick('resource', 'second-wind')
    s.tick('resource', 'second-wind')
    s.tick('slotPool', 'wizard-1')
    s.setCurrentHp(5)
    s.setDeathSaves(1, 2)
    s.applyLongRest()
    const t = s.getState().trackers
    expect(t.resources?.['second-wind']?.used).toBe(0)
    expect(t.slotPools?.['wizard-1']?.used).toBe(0)
    expect(t.hp).toEqual({ current: 24, temp: 0 })
    expect(t.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('long rest recovers each hit-dice group independently per its own recover rule', () => {
    const s = store()
    s.spendHitDie('fighter') // count 1
    s.spendHitDie('wizard')
    s.spendHitDie('wizard') // count 2, both spent
    s.applyLongRest()
    const hitDice = s.getState().trackers.hitDice
    expect(hitDice?.fighter?.spent).toBe(0) // recovers 1 of 1
    expect(hitDice?.wizard?.spent).toBe(1) // recovers 1 of 2 spent → 1 left
  })

  it("long rest restores HP to the maxHpOverride when one is set, not the compiled value", () => {
    const s = store()
    s.setMaxHpOverride(30)
    s.setCurrentHp(2)
    s.applyLongRest()
    expect(s.getState().trackers.hp).toEqual({ current: 30, temp: 0 })
  })

  it('clearing the override reverts long rest to the compiled maxHp', () => {
    const s = store()
    s.setMaxHpOverride(30)
    s.setMaxHpOverride(undefined)
    s.setCurrentHp(2)
    s.applyLongRest()
    expect(s.getState().trackers.hp).toEqual({ current: 24, temp: 0 })
  })
})

describe('consumables', () => {
  it('adjusts and clamps within [0, max]', () => {
    const s = store()
    s.adjustConsumable('arrows', -1)
    expect(s.getState().trackers.consumables?.arrows?.count).toBe(19)
    s.setConsumable('arrows', 999)
    expect(s.getState().trackers.consumables?.arrows?.count).toBe(20)
    s.setConsumable('arrows', -5)
    expect(s.getState().trackers.consumables?.arrows?.count).toBe(0)
  })
})

describe('hit dice', () => {
  it('spends and regains per class, clamped to the group count', () => {
    const s = store()
    s.spendHitDie('wizard') // count 2
    s.spendHitDie('wizard')
    s.spendHitDie('wizard') // clamps
    expect(s.getState().trackers.hitDice?.wizard?.spent).toBe(2)
    s.regainHitDie('wizard')
    expect(s.getState().trackers.hitDice?.wizard?.spent).toBe(1)
  })
})

describe('loadout', () => {
  it('selects and deselects pool options without duplicates', () => {
    const s = store()
    s.select('wizard-prepared', 'featherfall-ward')
    s.select('wizard-prepared', 'featherfall-ward') // no dup
    expect(s.getSelection('wizard-prepared')).toEqual([
      'mending-charm',
      'ashen-bolt',
      'featherfall-ward',
    ])
    s.deselect('wizard-prepared', 'ashen-bolt')
    expect(s.getSelection('wizard-prepared')).toEqual(['mending-charm', 'featherfall-ward'])
  })

  it('enforces the pool chooseCount — refuses a select once at the cap', () => {
    const s = store()
    s.select('wizard-prepared', 'featherfall-ward') // 3rd of chooseCount 4 — ok
    expect(s.getSelection('wizard-prepared')).toHaveLength(3)
    s.select('weapon-masteries', 'dagger') // weapon-masteries chooseCount 2, defaults already fill it
    expect(s.getSelection('weapon-masteries')).toEqual(['longsword', 'shortbow']) // refused, no 3rd
  })
})

describe('undo and subscribe', () => {
  it('undo reverts the last mutation and notifies subscribers', () => {
    const s = store()
    const seen: number[] = []
    s.subscribe((state) => seen.push(state.trackers.resources?.['second-wind']?.used ?? 0))
    s.tick('resource', 'second-wind')
    expect(s.getState().trackers.resources?.['second-wind']?.used).toBe(1)
    s.undoLast()
    expect(s.getState().trackers.resources?.['second-wind']?.used ?? 0).toBe(0)
    expect(seen).toEqual([1, 0])
  })

  it('undo reverses a whole rest as one step', () => {
    const s = store()
    s.tick('resource', 'second-wind')
    s.tick('resource', 'second-wind')
    s.applyLongRest()
    expect(s.getState().trackers.resources?.['second-wind']?.used).toBe(0)
    s.undoLast()
    expect(s.getState().trackers.resources?.['second-wind']?.used).toBe(2)
  })

  it('undo reverses a loadout change', () => {
    const s = store()
    s.select('wizard-prepared', 'featherfall-ward')
    s.undoLast()
    expect(s.getSelection('wizard-prepared')).toEqual(['mending-charm', 'ashen-bolt'])
  })

  it('getState returns a stable reference between mutations (useSyncExternalStore-safe)', () => {
    const s = store()
    const a = s.getState()
    const b = s.getState()
    expect(a).toBe(b)
    s.tick('resource', 'second-wind')
    expect(s.getState()).not.toBe(a)
  })
})

describe('companion namespacing', () => {
  it('a companion tick/HP never touches the main character trackers', () => {
    const s = store()
    const scope = { owner: 'ember-sprite' }
    s.setCurrentHp(3, scope)
    s.tick('resource', 'flicker-charge', scope)
    expect(s.getState().companions?.['ember-sprite']?.hp).toEqual({ current: 3, temp: undefined })
    expect(s.getState().companions?.['ember-sprite']?.resources?.['flicker-charge']?.used).toBe(1)
    expect(s.getState().trackers.hp).toEqual({ current: 24, temp: 0 })
    expect(s.getState().trackers.resources?.['flicker-charge']).toBeUndefined()
  })

  it('two variants of one character (two independent engines) never share state', () => {
    const a = store()
    const b = store()
    a.setCurrentHp(1)
    expect(b.getState().trackers.hp?.current).toBe(24)
  })
})

describe('reconcileSessionState', () => {
  it('drops orphaned resource/slotPool/hitDice/consumable/companion refs no longer in the file', () => {
    const saved: SessionFile = {
      ...seedSessionState(character),
      trackers: {
        ...seedSessionState(character).trackers,
        resources: { 'second-wind': { used: 1 }, 'stale-resource': { used: 1 } },
        slotPools: { 'wizard-1': { used: 1 }, 'stale-pool': { used: 1 } },
        hitDice: { wizard: { spent: 1 }, 'stale-class': { spent: 1 } },
        consumables: { arrows: { count: 5 }, 'stale-consumable': { count: 1 } },
      },
      companions: { 'ember-sprite': {}, 'stale-companion': {} },
    }
    const next = reconcileSessionState(saved, character)
    expect(next.trackers.resources).toEqual({ 'second-wind': { used: 1 } })
    expect(next.trackers.slotPools).toEqual({ 'wizard-1': { used: 1 } })
    expect(next.trackers.hitDice).toEqual({ wizard: { spent: 1 } })
    expect(next.trackers.consumables?.['stale-consumable']).toBeUndefined()
    expect(next.trackers.consumables?.arrows).toEqual({ count: 5 })
    expect(Object.keys(next.companions ?? {})).toEqual(['ember-sprite'])
  })

  it('drops orphaned loadout pool/option refs and seeds defaults for new pools', () => {
    const seeded = seedSessionState(character)
    const saved: SessionFile = {
      ...seeded,
      loadout: {
        pools: {
          'wizard-prepared': { selected: ['mending-charm', 'stale-spell-ref'] },
          'stale-pool': { selected: ['whatever'] },
        },
      },
    }
    const next = reconcileSessionState(saved, character)
    expect(next.loadout.pools?.['wizard-prepared']?.selected).toEqual(['mending-charm'])
    expect(next.loadout.pools?.['stale-pool']).toBeUndefined()
    // weapon-masteries wasn't in the saved loadout at all — reseeded from defaults.
    expect(next.loadout.pools?.['weapon-masteries']?.selected).toEqual(['longsword', 'shortbow'])
  })

  it('preserves untouched trackers/loadout state', () => {
    const saved = seedSessionState(character)
    saved.trackers.hp = { current: 10, temp: 2 }
    const next = reconcileSessionState(saved, character)
    expect(next.trackers.hp).toEqual({ current: 10, temp: 2 })
  })
})

describe('temp HP, currency, conditions, inspiration, equipped, additions', () => {
  it('sets temp HP for the main character and, namespaced, for a companion', () => {
    const s = store()
    s.setTempHp(4, { owner: 'character' })
    expect(s.getState().trackers.hp?.temp).toBe(4)
    s.setTempHp(2, { owner: 'ember-sprite' })
    expect(s.getState().companions?.['ember-sprite']?.hp).toEqual({ current: 0, temp: 2 })
  })

  it('a companion resource untick never touches the main character', () => {
    const s = store()
    const scope = { owner: 'ember-sprite' }
    s.tick('resource', 'flicker-charge', scope)
    s.tick('resource', 'flicker-charge', scope)
    s.untick('resource', 'flicker-charge', scope)
    expect(s.getState().companions?.['ember-sprite']?.resources?.['flicker-charge']?.used).toBe(1)
    expect(s.getState().trackers.resources).toEqual({})
  })

  it('sets currency, conditions (incl. companion), and inspiration', () => {
    const s = store()
    s.setCurrency({ gp: 100 })
    expect(s.getState().trackers.currency).toEqual({ gp: 100 })
    s.setConditions(['prone'])
    expect(s.getState().trackers.conditions).toEqual(['prone'])
    s.setConditions(['charmed'], { owner: 'ember-sprite' })
    expect(s.getState().companions?.['ember-sprite']?.conditions).toEqual(['charmed'])
    s.setInspiration(true)
    expect(s.getState().trackers.inspiration).toBe(true)
  })

  it('sets equipped/carried overrides per item', () => {
    const s = store()
    s.setEquipped('longsword', { equipped: true })
    expect(s.getState().loadout.equipped?.longsword).toEqual({ equipped: true })
    s.setEquipped('longsword', { carried: true })
    expect(s.getState().loadout.equipped?.longsword).toEqual({ equipped: true, carried: true })
  })

  it('adds and removes in-session additions', () => {
    const s = store()
    const id = s.addAddition({ kind: 'boon', name: 'Blessing of the tide' })
    expect(s.getState().additions?.[0]).toMatchObject({ id, kind: 'boon', name: 'Blessing of the tide' })
    s.removeAddition(id)
    expect(s.getState().additions).toEqual([])
  })

  it('undoLast is a no-op with empty history', () => {
    const s = store()
    const before = s.getState()
    s.undoLast()
    expect(s.getState()).toBe(before)
  })
})

describe('formula resolution edge cases', () => {
  it('resolves a "PB" formula token and falls back to undefined for an unrecognized formula', () => {
    const withFormulaResource: CharacterFile = {
      ...character,
      resources: [
        ...(character.resources ?? []),
        { id: 'pb-resource', name: 'PB Resource', max: 'PB', recover: [{ on: 'long', amount: 'all' }], unlockLevel: 1 },
        {
          id: 'free-form-resource',
          name: 'Free-form Resource',
          max: 'half your level',
          recover: [{ on: 'long', amount: 'half your level' }],
          unlockLevel: 1,
        },
      ],
    }
    const s = createSessionEngine(withFormulaResource, seedSessionState(withFormulaResource))
    // PB is 2 in the fixture — ticking 3 times clamps at 2.
    s.tick('resource', 'pb-resource')
    s.tick('resource', 'pb-resource')
    s.tick('resource', 'pb-resource')
    expect(s.getState().trackers.resources?.['pb-resource']?.used).toBe(2)

    // An unrecognized formula can't be clamped, so it's left unclamped.
    s.tick('resource', 'free-form-resource')
    s.tick('resource', 'free-form-resource')
    s.tick('resource', 'free-form-resource')
    expect(s.getState().trackers.resources?.['free-form-resource']?.used).toBe(3)

    // A string-formula recover rule can't be auto-applied either — left for the player.
    s.applyLongRest()
    expect(s.getState().trackers.resources?.['free-form-resource']?.used).toBe(3)
  })
})

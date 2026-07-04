/**
 * Ajv strict meta-validation of both schemas, plus positive/negative example
 * instances. Uses invented / Vice-homebrew content only — no WotC text.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import type { CharacterFile, SessionFile } from './types.ts'

function loadSchema(name: string): object {
  const url = new URL(`./${name}`, import.meta.url)
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const characterSchema = loadSchema('character.schema.json')
const sessionSchema = loadSchema('session.schema.json')

function makeAjv(): Ajv2020 {
  // strict: true rejects unknown keywords and ambiguous constructs -> this is
  // the "strict meta-validation" the task requires. allowUnionTypes permits the
  // deliberate `type: [number, string]` unions (StatValue.value, Extract.page)
  // without relaxing anything else.
  const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true })
  addFormats(ajv)
  return ajv
}

describe('schema meta-validation', () => {
  it('compiles character.schema.json under ajv strict mode', () => {
    expect(() => makeAjv().compile(characterSchema)).not.toThrow()
  })

  it('compiles session.schema.json under ajv strict mode', () => {
    expect(() => makeAjv().compile(sessionSchema)).not.toThrow()
  })
})

// A small valid character exercising the Shigen stress cases (§2.8):
// per-class levels + hit dice, a planned subclass, two slot pools at different
// recovery, spell origins, mixed-recovery resource, attack riders, ammo tallies.
const shigenLike: CharacterFile = {
  formatVersion: 1,
  meta: {
    name: 'Test Archer',
    characterId: 'test-archer',
    variantLabel: 'Eldritch Knight',
    createdAt: '2026-07-04T00:00:00Z',
    updatedAt: '2026-07-04T00:00:00Z',
  },
  chassis: {
    species: { ref: 'test-species' },
    background: { ref: 'homebrew-archer-priest' },
    classes: [
      {
        ref: 'fighter',
        levels: 1,
        hitDie: 'd10',
        classOrder: 1,
        subclass: { ref: 'eldritch-knight', unlockLevel: 3 },
      },
      {
        ref: 'warlock',
        levels: 5,
        hitDie: 'd8',
        classOrder: 2,
        subclass: { ref: 'celestial-patron', unlockLevel: 1 },
      },
    ],
  },
  abilities: {
    STR: { base: 10, final: 10, modifier: 0 },
    DEX: { base: 16, final: 16, modifier: 3 },
    CON: { base: 14, final: 14, modifier: 2 },
    INT: { base: 12, final: 12, modifier: 1 },
    WIS: { base: 13, final: 13, modifier: 1 },
    CHA: { base: 16, final: 17, modifier: 3, note: 'Test feat +1' },
  },
  stats: {
    ac: { value: 15, note: '13 + DEX (mage armor)' },
    maxHp: { value: 44 },
    initiative: { value: 3 },
    proficiencyBonus: 3,
    speeds: [{ type: 'walk', value: 30 }],
    hitDice: [
      { classRef: 'fighter', die: 'd10', count: 1 },
      { classRef: 'warlock', die: 'd8', count: 5 },
    ],
    saves: [
      { ability: 'STR', modifier: 3, proficient: true },
      { ability: 'CON', modifier: 5, proficient: true },
    ],
    skills: [{ name: 'Perception', ability: 'WIS', proficiency: 'proficient', modifier: 4 }],
  },
  currentLevel: 6,
  attacks: [
    {
      name: 'Longbow (True Strike)',
      toHit: { modifier: 8, magicBonus: 1 },
      range: '150/600 ft',
      damage: '{dmg:piercing|1d8+4}',
      consumableRef: 'arrows',
      riders: [{ name: 'SLOW', summary: '{note:on hit} target speed −10 ft until your next turn' }],
    },
  ],
  spellcasting: {
    sources: [
      {
        id: 'warlock',
        name: 'Warlock',
        classRef: 'warlock',
        ability: 'CHA',
        saveDc: 15,
        attackMod: 7,
      },
      {
        id: 'dragonmark',
        name: 'Mark of Making',
        originRef: 'mark-of-making',
        ability: 'CHA',
        saveDc: 15,
        attackMod: 7,
      },
    ],
    slotPools: [
      {
        id: 'pact-3',
        name: 'Pact Magic',
        sourceId: 'warlock',
        slotLevel: 3,
        count: 2,
        recover: [{ on: 'short', amount: 'all' }],
      },
      {
        id: 'mark-1',
        name: 'Mark of Making',
        sourceId: 'dragonmark',
        slotLevel: 1,
        count: 1,
        recover: [{ on: 'short', amount: 'all' }],
      },
    ],
    spells: [
      {
        name: 'Test Bolt',
        ref: 'test-bolt',
        level: 1,
        origins: ['warlock'],
        unlockLevel: 1,
        poolRef: 'warlock-prepared',
      },
      {
        name: 'Mending Spark',
        ref: 'mending-spark',
        level: 1,
        origins: ['dragonmark'],
        unlockLevel: 1,
      },
    ],
  },
  pools: {
    'warlock-prepared': {
      kind: 'preparedSpells',
      name: 'Warlock spells',
      sourceId: 'warlock',
      chooseCount: 8,
      options: [{ ref: 'test-bolt', name: 'Test Bolt' }],
      defaults: ['test-bolt'],
    },
  },
  resources: [
    {
      id: 'second-wind',
      name: 'Second Wind',
      max: 2,
      recover: [
        { on: 'long', amount: 'all' },
        { on: 'short', amount: 1 },
      ],
      unlockLevel: 1,
    },
  ],
  consumables: [{ id: 'arrows', name: 'Arrows', max: 40 }],
  library: {
    'test-species': {
      name: 'Test Species',
      edition: 'Homebrew',
      type: 'species',
      source: 'Homebrew',
      markdown: 'Invented.',
    },
    'homebrew-archer-priest': {
      name: 'Archer Priest',
      edition: 'Homebrew',
      type: 'background',
      source: 'Homebrew',
      markdown: 'Invented.',
    },
    fighter: {
      name: 'Fighter',
      edition: '2024',
      type: 'class',
      source: 'Test',
      markdown: 'Invented.',
    },
    warlock: {
      name: 'Warlock',
      edition: '2024',
      type: 'class',
      source: 'Test',
      markdown: 'Invented.',
    },
    'eldritch-knight': {
      name: 'Eldritch Knight',
      edition: '2024',
      type: 'subclass',
      source: 'Test',
      markdown: 'Invented.',
    },
    'celestial-patron': {
      name: 'Celestial Patron',
      edition: '2024',
      type: 'subclass',
      source: 'Test',
      markdown: 'Invented.',
    },
    'mark-of-making': {
      name: 'Mark of Making',
      edition: 'Homebrew',
      type: 'feat',
      source: 'Homebrew',
      markdown: 'Invented.',
    },
    'test-bolt': {
      name: 'Test Bolt',
      edition: 'Homebrew',
      type: 'spell',
      source: 'Homebrew',
      markdown: 'Invented.',
    },
    'mending-spark': {
      name: 'Mending Spark',
      edition: 'Homebrew',
      type: 'spell',
      source: 'Homebrew',
      markdown: 'Invented.',
    },
  },
}

const validSession: SessionFile = {
  formatVersion: 1,
  characterId: 'test-archer',
  variantLabel: 'Eldritch Knight',
  characterFormatVersion: 1,
  updatedAt: '2026-07-04T00:00:00Z',
  trackers: {
    hp: { current: 30, temp: 0 },
    slotPools: { 'pact-3': { used: 1 } },
    resources: { 'second-wind': { used: 1 } },
    hitDice: { fighter: { spent: 0 }, warlock: { spent: 2 } },
    consumables: { arrows: { count: 32 } },
    currency: { gp: 15 },
    inspiration: true,
  },
  loadout: {
    pools: { 'warlock-prepared': { selected: ['test-bolt'] } },
  },
  additions: [
    {
      id: 'a1',
      kind: 'boon',
      name: 'DM blessing',
      summary: '{adv} on next {save:WIS}',
      addedAt: '2026-07-04T00:00:00Z',
    },
  ],
}

describe('character instances', () => {
  const validate: ValidateFunction = makeAjv().compile(characterSchema)

  it('accepts a valid multiclass character', () => {
    const ok = validate(shigenLike)
    expect(validate.errors ?? []).toEqual([])
    expect(ok).toBe(true)
  })

  it('rejects an unknown top-level property', () => {
    expect(validate({ ...shigenLike, bogus: true })).toBe(false)
  })

  it('rejects a missing required region', () => {
    const { stats: _stats, ...noStats } = shigenLike
    void _stats
    expect(validate(noStats)).toBe(false)
  })

  it('rejects a bad ability enum in a save', () => {
    const bad = clone(shigenLike)
    // @ts-expect-error intentionally invalid ability
    bad.stats.saves[0].ability = 'LUCK'
    expect(validate(bad)).toBe(false)
  })

  it('rejects a wrong formatVersion', () => {
    expect(validate({ ...shigenLike, formatVersion: 2 })).toBe(false)
  })
})

describe('session instances', () => {
  const validate = makeAjv().compile(sessionSchema)

  it('accepts a valid session', () => {
    const ok = validate(validSession)
    expect(validate.errors ?? []).toEqual([])
    expect(ok).toBe(true)
  })

  it('rejects an unknown addition kind', () => {
    const bad = clone(validSession)
    // @ts-expect-error intentionally invalid kind
    bad.additions[0].kind = 'quest'
    expect(validate(bad)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import { groupProgression } from './group'

const character = fixture as unknown as CharacterFile

describe('groupProgression — synthetic multiclass fixture', () => {
  const groups = groupProgression(character)

  it('produces one group per class, ordered by classOrder', () => {
    expect(groups.classes.map((c) => c.classEntry.ref)).toEqual(['fighter', 'wizard'])
  })

  it('buckets core features, subclass features, and the proficiency line per class', () => {
    const fighter = groups.classes[0]
    expect(fighter.proficiencyLine?.name).toBe('Fighter proficiencies')
    expect(fighter.core.map((i) => i.name)).toEqual(['Fighting Style: Defense', 'Second Wind'])
    expect(fighter.subclassFeatures.map((i) => i.name)).toEqual(['Eldritch Knight'])

    const wizard = groups.classes[1]
    expect(wizard.proficiencyLine?.name).toBe('Wizard proficiencies')
    expect(wizard.core.map((i) => i.name)).toEqual(['Arcane Recovery'])
    expect(wizard.subclassFeatures.map((i) => i.name)).toEqual(['War Magic'])
  })

  it('keeps feat/ASI items out of class groups regardless of classRef', () => {
    for (const cls of groups.classes) {
      expect(cls.core.some((i) => i.kind === 'feat' || i.kind === 'asi')).toBe(false)
    }
  })

  it('collects classless feature items as species traits', () => {
    expect(groups.speciesTraits.map((i) => i.name)).toEqual(['Umbral Step'])
  })

  it('collects feat and ASI items into a single feats bucket, ordered by unlockLevel', () => {
    expect(groups.feats.map((i) => i.name)).toEqual([
      'Tireless Cartographer',
      'Ability Score Improvement',
    ])
  })
})

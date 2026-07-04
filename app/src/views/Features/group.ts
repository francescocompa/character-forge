import type { CharacterFile, ClassEntry, ProgressionItem } from '@character-forge/schema/types.ts'

/**
 * Pure grouping of `progression[]` into the Features-view IA (T09). The schema
 * doesn't carry a per-item "which section" discriminator, so the convention —
 * documented here rather than in the schema, since it needs no schema change —
 * is: `classRef` sorts an item into that class's section; among classRef-less
 * items, `kind: 'feature'` is a species trait (species is the only source of
 * classless *features* — 2024-style backgrounds grant proficiencies + a feat,
 * not features); `kind: 'feat' | 'asi'` always lands in the top-level Feats
 * section regardless of `classRef` (an ASI granted by class-level advancement
 * still reads as a feat-or-ASI choice, not a class feature, on the paper sheet).
 */

export interface ClassFeatures {
  classEntry: ClassEntry
  /** The `kind: 'proficiency'` item for this class, if the compiler emitted one. */
  proficiencyLine?: ProgressionItem
  /** Core class features, ordered by unlockLevel. */
  core: ProgressionItem[]
  /** Subclass features (`kind: 'subclass'`), ordered by unlockLevel. */
  subclassFeatures: ProgressionItem[]
  /** Known-options sub-list (`kind: 'invocation'`), ordered by unlockLevel. */
  invocations: ProgressionItem[]
}

export interface FeatureGroups {
  classes: ClassFeatures[]
  speciesTraits: ProgressionItem[]
  feats: ProgressionItem[]
}

function byLevel(a: ProgressionItem, b: ProgressionItem): number {
  return a.unlockLevel - b.unlockLevel
}

export function groupProgression(character: CharacterFile): FeatureGroups {
  const progression = character.progression ?? []

  const classes: ClassFeatures[] = [...character.chassis.classes]
    .sort((a, b) => a.classOrder - b.classOrder)
    .map((classEntry) => {
      const items = progression.filter((p) => p.classRef === classEntry.ref)
      return {
        classEntry,
        proficiencyLine: items.find((p) => p.kind === 'proficiency'),
        core: items.filter((p) => p.kind === 'feature' || p.kind === 'other').sort(byLevel),
        subclassFeatures: items.filter((p) => p.kind === 'subclass').sort(byLevel),
        invocations: items.filter((p) => p.kind === 'invocation').sort(byLevel),
      }
    })

  const speciesTraits = progression.filter((p) => !p.classRef && p.kind === 'feature').sort(byLevel)
  const feats = progression.filter((p) => p.kind === 'feat' || p.kind === 'asi').sort(byLevel)

  return { classes, speciesTraits, feats }
}

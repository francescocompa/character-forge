import type { CharacterFile } from '@character-forge/schema/types.ts'

/** "About this file" facts (T16 deliverable 3): version, compile date, content counts. */
export interface CharacterAbout {
  formatVersion: number
  /** The file's compiled/updated date (meta.updatedAt), formatted for display, or undefined if unparseable. */
  compiledAt?: string
  libraryEntries: number
  spells: number
  classes: number
  progressionItems: number
}

function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function characterAbout(character: CharacterFile): CharacterAbout {
  return {
    formatVersion: character.formatVersion,
    compiledAt: formatDate(character.meta.updatedAt),
    libraryEntries: Object.keys(character.library).length,
    spells: character.spellcasting?.spells.length ?? 0,
    classes: character.chassis.classes.length,
    progressionItems: character.progression?.length ?? 0,
  }
}

/** Short class + level line for a card / switcher, e.g. "Fighter 1 · Wizard 2". */
export function classLine(character: CharacterFile): string {
  const parts = character.chassis.classes
    .slice()
    .sort((a, b) => a.classOrder - b.classOrder)
    .map((c) => `${c.displayName ?? character.library[c.ref]?.name ?? c.ref} ${c.levels}`)
  return parts.join(' · ')
}

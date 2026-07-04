import type { Pool, PoolOption, Spell, SpellSource, SpellSwap } from '@character-forge/schema/types.ts'
import { isFuture, isVisible, type ViewMode } from '../../character/visibility'

/**
 * Pure helpers for the Spells view (T10). Kept free of React/session so the
 * IA rules — level grouping, dual-origin colors, and the D13 "current
 * selection + always-prepared" filter — are unit-testable on their own.
 */

export interface LevelGroup<T> {
  /** `0` = cantrips; `undefined` = a pool option with no matching known spell (browsed, not yet known). */
  level: number | undefined
  items: T[]
}

function levelSort(a: number | undefined, b: number | undefined): number {
  if (a === undefined) return b === undefined ? 0 : 1
  if (b === undefined) return -1
  return a - b
}

/** Cantrips first, then ascending; unmatched pool options ("Other") last. */
export function levelLabel(level: number | undefined): string {
  if (level === undefined) return 'Other'
  if (level === 0) return 'Cantrips'
  const mod100 = level % 100
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][level % 10] ?? 'th'
  return `${level}${suffix} level`
}

/** Groups `spellcasting.spells[]` by level, cantrips first (the main spell list's IA). */
export function groupSpellsByLevel(spells: readonly Spell[]): LevelGroup<Spell>[] {
  const levels = Array.from(new Set(spells.map((s) => s.level))).sort(levelSort)
  return levels.map((level) => ({ level, items: spells.filter((s) => s.level === level) }))
}

/**
 * Groups a `preparedSpells` pool's full option list by level, for manage
 * mode's "browse the embedded pool" IA. `PoolOption` carries no `level` of its
 * own (the schema's generic `Pool` shape is shared with non-spell pool kinds
 * like `weaponMasteries`), so this matches each option against the known
 * `spellcasting.spells[]` by ref (falling back to name) to find its level.
 * Options with no match (candidates the character doesn't know yet, e.g. a
 * pool entry from the wider class list) land in an `undefined`-level "Other"
 * bucket rather than being silently dropped.
 */
export function groupPoolOptionsByLevel(pool: Pool, spells: readonly Spell[]): LevelGroup<PoolOption>[] {
  const levelOf = (option: PoolOption): number | undefined =>
    spells.find((s) => s.ref === option.ref || s.name === option.name)?.level

  const withLevel = pool.options.map((option) => ({ option, level: levelOf(option) }))
  const levels = Array.from(new Set(withLevel.map((w) => w.level))).sort(levelSort)
  return levels.map((level) => ({
    level,
    items: withLevel.filter((w) => w.level === level).map((w) => w.option),
  }))
}

/** Stable `SpellSource.id` -> palette-index map, in `sources[]` declaration order (origin-dot colors). */
export function sourceIndex(sources: readonly SpellSource[]): Map<string, number> {
  return new Map(sources.map((s, i) => [s.id, i]))
}

/**
 * Whether a spell renders in the clean play list right now — D13's "current
 * selection + always-prepared spells". Only `role: 'prepared'` spells are
 * gated: deselecting one in manage mode drops it from the sheet without
 * touching the compiled file. A `'prepared'` spell with no `poolRef` has no
 * pool to be gated by (schema: "Absent = always available"). A future
 * (not-yet-unlocked) prepared spell has no selection to check yet, so Build
 * view previews it like every other future item instead of hiding it.
 */
export function isSpellShown(
  spell: Spell,
  currentLevel: number,
  viewMode: ViewMode,
  selected: readonly string[],
): boolean {
  if (!isVisible(spell.unlockLevel, currentLevel, viewMode)) return false
  if (spell.role !== 'prepared') return true
  if (!spell.poolRef) return true
  if (isFuture(spell.unlockLevel, currentLevel)) return true
  return spell.ref ? selected.includes(spell.ref) : true
}

/** `spellcasting.swaps[]`, oldest first — the Build-view swap-history links (§2.8). */
export function sortedSwaps(swaps: readonly SpellSwap[] | undefined): SpellSwap[] {
  return [...(swaps ?? [])].sort((a, b) => a.atLevel - b.atLevel)
}

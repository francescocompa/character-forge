import type { ProgressionItem } from '@character-forge/schema/types.ts'

/**
 * The global content filter (D14). Every view shares these two pure helpers via
 * `CharacterProvider`, so "what shows at this level" is decided in exactly one
 * place and can't drift between the main sheet, features, and spells.
 */
export type ViewMode = 'level' | 'build'

/**
 * Whether an `unlockLevel`-stamped item renders in the given mode.
 * - Level view: only content already unlocked (`unlockLevel ≤ currentLevel`).
 * - Build view: everything (future items are shown grayed — see {@link isFuture}).
 *
 * A missing `unlockLevel` means base content (treated as level 1), always shown.
 */
export function isVisible(
  unlockLevel: number | undefined,
  currentLevel: number,
  mode: ViewMode,
): boolean {
  if (mode === 'build') return true
  return (unlockLevel ?? 1) <= currentLevel
}

/**
 * Whether an item is *future* content — unlocked above the current level. Build
 * view wraps these in the paper-style grayed + level-badged treatment
 * (`FutureWrap`); Level view never renders them at all.
 */
export function isFuture(unlockLevel: number | undefined, currentLevel: number): boolean {
  return (unlockLevel ?? 1) > currentLevel
}

/** Convenience for the common case of filtering a progression list for a mode. */
export function visibleItems<T extends { unlockLevel?: ProgressionItem['unlockLevel'] }>(
  items: readonly T[],
  currentLevel: number,
  mode: ViewMode,
): T[] {
  return items.filter((item) => isVisible(item.unlockLevel, currentLevel, mode))
}

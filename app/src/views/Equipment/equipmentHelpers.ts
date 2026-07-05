import type { Addition, CharacterFile, Currency, Item } from '@character-forge/schema/types.ts'

/**
 * Pure helpers for the Equipment view (T11). The schema has no per-item
 * section discriminator (same gap T09 hit with `progression[]`), so the
 * convention — documented here rather than in the schema, since it needs no
 * schema change — is: the library extract's `type` sorts an item into
 * `'magic item'` -> Magic Items, `'component'` -> Components, anything else
 * (or a ref with no extract) -> Gear. The compiler (T18/T19) should follow the
 * same convention when it starts emitting real files.
 */
export type ItemSection = 'gear' | 'components' | 'magicItems'

export function classifyItem(item: Item, library: CharacterFile['library']): ItemSection {
  const type = item.ref ? library[item.ref]?.type : undefined
  if (type === 'magic item') return 'magicItems'
  if (type === 'component') return 'components'
  return 'gear'
}

export interface ItemGroups {
  gear: Item[]
  components: Item[]
  magicItems: Item[]
}

/** Buckets `equipment.items[]` into the Equipment-view sections, preserving file order within each. */
export function groupItems(items: readonly Item[], library: CharacterFile['library']): ItemGroups {
  const groups: ItemGroups = { gear: [], components: [], magicItems: [] }
  for (const item of items) groups[classifyItem(item, library)].push(item)
  return groups
}

export type EquippedOverride = { equipped?: boolean; carried?: boolean } | undefined

/** Effective equipped/carried state: session override (D13) first, else the file's compiled default. */
export function effectiveState(
  item: Pick<Item, 'equipped' | 'carried'>,
  override: EquippedOverride,
): { equipped: boolean; carried: boolean } {
  return {
    equipped: override?.equipped ?? item.equipped ?? false,
    carried: override?.carried ?? item.carried ?? true,
  }
}

/**
 * Total weight of currently-carried items (arithmetic sum, not a rules
 * computation — scope §14 improvement #8). Un-carried items (dropped, stashed
 * at camp) don't count toward capacity, and neither does an item not yet
 * unlocked — Build view previews future gear grayed in the list (D14), but
 * you don't have it yet, so it can't weigh you down. This filter is
 * `currentLevel`-based rather than the view-mode-aware `isVisible`, so the
 * total doesn't change when the player flips Level/Build.
 */
export function totalCarriedWeightLb(
  items: readonly Item[],
  currentLevel: number,
  overrides: Record<string, EquippedOverride> | undefined,
): number {
  return items.reduce((sum, item) => {
    if ((item.unlockLevel ?? 1) > currentLevel) return sum
    const { carried } = effectiveState(item, overrides?.[item.id])
    return carried ? sum + (item.weightLb ?? 0) * item.quantity : sum
  }, 0)
}

/**
 * Weight of in-session found items (D2, T15). They have no equipped/carried
 * toggle — a found item is on you — so all of them count, quantity x per-unit
 * weight. Non-item additions (boons, notes) are weightless.
 */
export function itemAdditionsWeightLb(additions: readonly Addition[] | undefined): number {
  return (additions ?? []).reduce((sum, a) => {
    if (a.kind !== 'item') return sum
    return sum + (a.weightLb ?? 0) * (a.quantity ?? 1)
  }, 0)
}

/** SRD baseline: push/drag/lift is twice carrying capacity. Plain arithmetic, not a rules engine. */
export function pushDragLiftLb(carryingCapacityLb: number): number {
  return carryingCapacityLb * 2
}

/** Items currently attuned (compiled default; the session layer has no attunement toggle in v1). */
export function attunedItems(items: readonly Item[]): Item[] {
  return items.filter((item) => item.attuned)
}

export const CURRENCY_DENOMINATIONS: { key: keyof Currency; label: string }[] = [
  { key: 'pp', label: 'PP' },
  { key: 'gp', label: 'GP' },
  { key: 'ep', label: 'EP' },
  { key: 'sp', label: 'SP' },
  { key: 'cp', label: 'CP' },
]

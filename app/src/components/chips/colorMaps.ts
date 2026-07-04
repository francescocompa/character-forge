import type { Ability } from '@character-forge/schema/types.ts'

/**
 * Recognized damage types (markup-grammar.md §3). An unrecognized type still
 * renders — components fall back to `--dmg-neutral` — which is what keeps
 * homebrew damage types working per the grammar's contract.
 */
export type DamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder'

export const ABILITY_COLOR: Record<Ability, string> = {
  STR: 'var(--ability-str)',
  DEX: 'var(--ability-dex)',
  CON: 'var(--ability-con)',
  INT: 'var(--ability-int)',
  WIS: 'var(--ability-wis)',
  CHA: 'var(--ability-cha)',
}

export const ABILITY_SOFT: Record<Ability, string> = {
  STR: 'var(--ability-str-soft)',
  DEX: 'var(--ability-dex-soft)',
  CON: 'var(--ability-con-soft)',
  INT: 'var(--ability-int-soft)',
  WIS: 'var(--ability-wis-soft)',
  CHA: 'var(--ability-cha-soft)',
}

const DAMAGE_COLOR: Record<DamageType, string> = {
  acid: 'var(--dmg-acid)',
  bludgeoning: 'var(--dmg-bludgeoning)',
  cold: 'var(--dmg-cold)',
  fire: 'var(--dmg-fire)',
  force: 'var(--dmg-force)',
  lightning: 'var(--dmg-lightning)',
  necrotic: 'var(--dmg-necrotic)',
  piercing: 'var(--dmg-piercing)',
  poison: 'var(--dmg-poison)',
  psychic: 'var(--dmg-psychic)',
  radiant: 'var(--dmg-radiant)',
  slashing: 'var(--dmg-slashing)',
  thunder: 'var(--dmg-thunder)',
}

/** Looks up a damage type's color, falling back to neutral for unrecognized/homebrew types. */
export function damageColor(type: string | undefined): string {
  if (!type) return 'var(--dmg-neutral)'
  return DAMAGE_COLOR[type as DamageType] ?? 'var(--dmg-neutral)'
}

/** Origin-dot accent palette (multiclass spell/feature source tagging, scope §2.8). */
export const ORIGIN_COLORS = [
  'var(--origin-1)',
  'var(--origin-2)',
  'var(--origin-3)',
  'var(--origin-4)',
  'var(--origin-5)',
  'var(--origin-6)',
]

export function originColor(index: number): string {
  return ORIGIN_COLORS[((index % ORIGIN_COLORS.length) + ORIGIN_COLORS.length) % ORIGIN_COLORS.length]
}

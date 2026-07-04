import type { Ability } from '@character-forge/schema/types.ts'

/** Canonical ability order (STR → CHA), used everywhere abilities are listed. */
export const ABILITY_ORDER: readonly Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

/** Format a modifier with an explicit sign and a true minus glyph: 3 → "+3", -1 → "−1". */
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`
}

/** Kilograms display for a pounds weight (scope §2.6: weights shown in lb and kg). */
export function lbToKg(lb: number): number {
  return Math.round(lb * 0.4536 * 10) / 10
}

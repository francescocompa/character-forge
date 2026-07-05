import type { CharacterFile } from '@character-forge/schema/types.ts'
// The synthetic fixtures are the only characters bundled into the app: the
// CI-safe, WotC-free path (scope §4). Real characters embed KB extracts and are
// never committed, so they never ship in the build. Both are validated by the
// T04 pipeline before they land, so the app trusts their shape. They back the
// "Load sample" affordance on the empty library screen (T16) — a variant pair,
// so first-run users see the grouping + variant switcher immediately.
import syntheticJson from '../../../fixtures/synthetic.character.json'
import syntheticVariantJson from '../../../fixtures/synthetic-variant.character.json'

/** The bundled sample character and its variant (same characterId, D12). */
export const SAMPLE_CHARACTERS: CharacterFile[] = [
  syntheticJson as unknown as CharacterFile,
  syntheticVariantJson as unknown as CharacterFile,
]

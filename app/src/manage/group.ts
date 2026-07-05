import type { StoredCharacter } from '../state/characterDb'

/** One card in the library: a character and all its variants (D12). */
export interface CharacterGroup {
  characterId: string
  /** Display name: the alias if set, else the file's `meta.name`. */
  name: string
  alias?: string
  variants: StoredCharacter[]
}

/**
 * Group stored variants under one card per `characterId` (D12), sorted for a
 * stable UI: cards by display name, variants by label. The alias (shared across
 * a character's variants) is lifted to the group.
 */
export function groupCharacters(stored: StoredCharacter[]): CharacterGroup[] {
  const byId = new Map<string, StoredCharacter[]>()
  for (const record of stored) {
    const bucket = byId.get(record.characterId)
    if (bucket) bucket.push(record)
    else byId.set(record.characterId, [record])
  }

  const groups: CharacterGroup[] = []
  for (const [characterId, variants] of byId) {
    variants.sort((a, b) => (a.variantLabel ?? '').localeCompare(b.variantLabel ?? ''))
    const alias = variants.find((v) => v.alias)?.alias
    groups.push({
      characterId,
      name: alias ?? variants[0].character.meta.name,
      alias,
      variants,
    })
  }
  groups.sort((a, b) => a.name.localeCompare(b.name))
  return groups
}

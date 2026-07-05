import { useEffect, useState } from 'react'
import { AppShell } from '../app/AppShell'
import type { CharacterGroup } from './group'

/** Remembers the last-open variant per character, so reopening lands where you left off. */
const variantMemory = new Map<string, string>()

/**
 * The opened character (T16): picks the active variant, renders the switcher
 * (chip row, when a character has more than one build), and hands the active
 * file to {@link AppShell}. Switching variants remounts the shell (via `key`),
 * so each variant gets its own independent session store (D12).
 */
export function CharacterWorkspace({
  group,
  onBack,
}: {
  group: CharacterGroup
  onBack: () => void
}) {
  const remembered = variantMemory.get(group.characterId)
  const initial = group.variants.find((v) => v.key === remembered) ?? group.variants[0]
  const [activeKey, setActiveKey] = useState(initial.key)

  // Keep the active key valid if the variant set changes underneath us (e.g. a
  // variant was deleted while this character stayed open).
  const active = group.variants.find((v) => v.key === activeKey) ?? group.variants[0]

  useEffect(() => {
    variantMemory.set(group.characterId, active.key)
  }, [group.characterId, active.key])

  const variants =
    group.variants.length > 1
      ? group.variants.map((v) => ({ key: v.key, label: v.variantLabel ?? 'Default' }))
      : undefined

  return (
    <AppShell
      key={active.key}
      character={active.character}
      displayName={group.name}
      onBack={onBack}
      variants={variants}
      activeVariantKey={active.key}
      onSelectVariant={setActiveKey}
    />
  )
}

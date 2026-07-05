import type { ProgressionItem } from '@character-forge/schema/types.ts'
import { useCharacter } from '../../character/CharacterProvider'
import { CollapsibleSection } from './CollapsibleSection'
import { FeatureList } from './ProgressionRow'

/** "Background" for a classless feat/ASI, or the granting class's name otherwise. */
function originTag(
  item: ProgressionItem,
  nameOf: (ref?: string, displayName?: string) => string,
): string {
  return item.classRef ? nameOf(item.classRef) : 'Background'
}

/**
 * Feats section: every `kind: 'feat'` or `'asi'` item (background feat, class
 * ASI/feat choices), each tagged with its origin. Future slots (an ASI not yet
 * reached) render grayed with their unlock badge, same as everywhere else.
 */
export function FeatsSection({ feats }: { feats: ProgressionItem[] }) {
  const { nameOf, isVisible } = useCharacter()
  if (!feats.some((f) => isVisible(f.unlockLevel))) return null
  return (
    <CollapsibleSection title="Feats" className="chassis-section">
      <FeatureList items={feats} originOf={(item) => originTag(item, nameOf)} />
    </CollapsibleSection>
  )
}

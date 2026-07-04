import { FutureWrap, LevelBadge, RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { CollapsibleSection } from './CollapsibleSection'
import { FeatureList } from './ProgressionRow'
import type { ClassFeatures } from './group'

/** Class header: level badge, class name (ref popover), subclass (grayed until unlocked). */
function ClassHeader({ group }: { group: ClassFeatures }) {
  const { nameOf, viewMode, isVisible, isFuture } = useCharacter()
  const { openRef } = useLibrary()
  const { classEntry } = group
  const sub = classEntry.subclass
  const showSub = sub && isVisible(sub.unlockLevel)
  const subFuture = sub && isFuture(sub.unlockLevel)

  return (
    <span className="class-section__heading">
      <LevelBadge level={classEntry.levels} />
      <RefLink
        label={nameOf(classEntry.ref, classEntry.displayName)}
        onClick={() => openRef(classEntry.ref)}
      />
      {showSub &&
        (subFuture && viewMode === 'build' ? (
          <FutureWrap level={sub!.unlockLevel}>
            <RefLink label={nameOf(sub!.ref, sub!.displayName)} onClick={() => openRef(sub!.ref)} />
          </FutureWrap>
        ) : (
          <span className="class-section__sub">
            <RefLink label={nameOf(sub!.ref, sub!.displayName)} onClick={() => openRef(sub!.ref)} />
          </span>
        ))}
    </span>
  )
}

/**
 * One class's Features section (multiclass canon, scope §2.8): header with
 * level + subclass, the compiled proficiency header line, then core features,
 * subclass features, and invocations/known-options as ordered sub-lists.
 */
export function ClassSection({ group }: { group: ClassFeatures }) {
  return (
    <CollapsibleSection title={<ClassHeader group={group} />} className="class-section">
      {group.proficiencyLine?.summary && (
        <p className="class-section__profs">
          <MarkupText source={group.proficiencyLine.summary} />
        </p>
      )}
      <FeatureList items={group.core} />
      {group.subclassFeatures.length > 0 && (
        <FeatureList items={group.subclassFeatures} className="feature-list--subclass" />
      )}
      {group.invocations.length > 0 && (
        <FeatureList items={group.invocations} className="feature-list--invocations" />
      )}
    </CollapsibleSection>
  )
}

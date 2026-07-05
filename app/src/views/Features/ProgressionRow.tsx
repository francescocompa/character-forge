import type { ProgressionItem } from '@character-forge/schema/types.ts'
import { FutureWrap, RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSessionState } from '../../session/SessionProvider'
import { TrackerTicks } from '../MainSheet/Ticks'
import { RecoverBadges, maxCount } from '../MainSheet/Resources'

/** MAX + recovery icons + interactive USED ticks for a feature's `limitedUseRef`. */
function LimitedUse({ resourceId }: { resourceId: string }) {
  const { character } = useCharacter()
  const { trackers } = useSessionState()
  const resource = character.resources?.find((r) => r.id === resourceId)
  if (!resource) return null
  const total = maxCount(resource.max, character.stats.proficiencyBonus)
  const used = trackers.resources?.[resource.id]?.used ?? 0
  return (
    <div className="feature-row__use">
      <RecoverBadges recover={resource.recover} />
      {total !== null ? (
        <TrackerTicks
          kind="resource"
          id={resource.id}
          total={total}
          used={used}
          label={`${resource.name} uses`}
        />
      ) : (
        <span className="resource__formula">{resource.max}</span>
      )}
    </div>
  )
}

function RowBody({ item, origin }: { item: ProgressionItem; origin?: string }) {
  const { openRef } = useLibrary()
  const name = item.displayName ?? item.name
  return (
    <div className="feature-row">
      <span className="feature-row__name">
        {item.ref ? <RefLink label={name} onClick={() => openRef(item.ref!)} /> : name}
      </span>
      {origin && <span className="feature-row__origin">{origin}</span>}
      {item.summary && (
        <div className="feature-row__summary">
          <MarkupText source={item.summary} />
        </div>
      )}
      {item.limitedUseRef && <LimitedUse resourceId={item.limitedUseRef} />}
    </div>
  )
}

/** One progression item: future-grayed + badged in Build view, plain otherwise. */
export function ProgressionRow({ item, origin }: { item: ProgressionItem; origin?: string }) {
  const { viewMode, isFuture } = useCharacter()
  if (viewMode === 'build' && isFuture(item.unlockLevel)) {
    return (
      <li className="feature-list__item feature-list__item--future">
        <FutureWrap level={item.unlockLevel}>
          <RowBody item={item} origin={origin} />
        </FutureWrap>
      </li>
    )
  }
  return (
    <li className="feature-list__item">
      <RowBody item={item} origin={origin} />
    </li>
  )
}

export interface FeatureListProps {
  items: ProgressionItem[]
  className?: string
  /** Per-item origin tag (Feats section: which class/background granted it). */
  originOf?: (item: ProgressionItem) => string | undefined
}

/** A visibility-filtered list of progression items, ordered by unlockLevel within the group. */
export function FeatureList({ items, className, originOf }: FeatureListProps) {
  const { isVisible } = useCharacter()
  const visible = items.filter((item) => isVisible(item.unlockLevel))
  if (visible.length === 0) return null
  return (
    <ul className={`feature-list ${className ?? ''}`}>
      {visible.map((item, i) => (
        <ProgressionRow
          key={item.ref ?? `${item.name}-${i}`}
          item={item}
          origin={originOf?.(item)}
        />
      ))}
    </ul>
  )
}

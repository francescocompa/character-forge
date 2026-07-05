import type { ActionEconomy, ActionItem } from '@character-forge/schema/types.ts'
import { FutureWrap, RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter, type CharacterContextValue } from '../../character/CharacterProvider'

const GROUPS: { key: keyof ActionEconomy; label: string }[] = [
  { key: 'actions', label: 'Actions' },
  { key: 'bonusActions', label: 'Bonus actions' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'other', label: 'Other' },
]

function hasVisibleItem(
  items: ActionItem[] | undefined,
  isVisible: CharacterContextValue['isVisible'],
) {
  return (items ?? []).some((item) => isVisible(item.unlockLevel))
}

function ActionRowBody({ item }: { item: ActionItem }) {
  const { openRef } = useLibrary()
  return (
    <div className="action-row">
      <span className="action-row__name">
        {item.ref ? <RefLink label={item.name} onClick={() => openRef(item.ref!)} /> : item.name}
      </span>
      {item.summary && (
        <div className="action-row__summary">
          <MarkupText source={item.summary} />
        </div>
      )}
    </div>
  )
}

/** One action-economy entry: future-grayed + badged in Build view, plain otherwise. */
function ActionRow({ item }: { item: ActionItem }) {
  const { viewMode, isFuture } = useCharacter()
  if (viewMode === 'build' && isFuture(item.unlockLevel)) {
    return (
      <li className="action-group__item action-group__item--future">
        <FutureWrap level={item.unlockLevel}>
          <ActionRowBody item={item} />
        </FutureWrap>
      </li>
    )
  }
  return (
    <li className="action-group__item">
      <ActionRowBody item={item} />
    </li>
  )
}

function ActionGroup({ label, items }: { label: string; items: ActionItem[] }) {
  const { isVisible } = useCharacter()
  const visible = items.filter((item) => isVisible(item.unlockLevel))
  if (visible.length === 0) return null
  return (
    <div className="action-group">
      <h3 className="action-group__header">{label}</h3>
      <ul className="action-group__list">
        {visible.map((item, i) => (
          <ActionRow key={item.ref ?? `${item.name}-${i}`} item={item} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Actions / bonus actions / reactions panel (T13): the at-the-table combat
 * brain, grouped by action economy exactly as the compiler assigned each
 * entry. Standard actions (Dash, Hide…) the compiler chose to include render
 * identically to feature-granted ones — no special casing, trust the file.
 * Desktop: columns side by side inside the T08 tempo slot. Mobile: stacked
 * groups with sticky headers (mainSheet.css).
 */
export function ActionsSlot() {
  const { character, isVisible } = useCharacter()
  const economy = character.actionEconomy
  const groups = GROUPS.filter((g) => hasVisibleItem(economy?.[g.key], isVisible))
  if (groups.length === 0) return null
  return (
    <section className="panel actions" aria-label="Actions" data-slot="t13-actions">
      <h2 className="panel__title">Actions</h2>
      <div className="actions__groups">
        {groups.map((g) => (
          <ActionGroup key={g.key} label={g.label} items={economy?.[g.key] ?? []} />
        ))}
      </div>
    </section>
  )
}

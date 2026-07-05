import type { Addition, Item } from '@character-forge/schema/types.ts'
import { FutureWrap, RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { AdditionControls, SessionMarker } from '../../session/additions'
import { effectiveState, groupItems } from './equipmentHelpers'

function ItemRowBody({ item }: { item: Item }) {
  const { openRef } = useLibrary()
  const store = useSession()
  const { loadout } = useSessionState()
  const { equipped, carried } = effectiveState(item, loadout.equipped?.[item.id])

  return (
    <div className="gear-item">
      <div className="gear-item__head">
        <label className="gear-item__toggle">
          <input
            type="checkbox"
            checked={equipped}
            onChange={(e) => store.setEquipped(item.id, { equipped: e.target.checked })}
          />
          Equipped
        </label>
        <label className="gear-item__toggle">
          <input
            type="checkbox"
            checked={carried}
            onChange={(e) => store.setEquipped(item.id, { carried: e.target.checked })}
          />
          Carried
        </label>
        <span className="gear-item__name">
          {item.ref ? <RefLink label={item.name} onClick={() => openRef(item.ref!)} /> : item.name}
        </span>
        {item.quantity > 1 && <span className="gear-item__qty">×{item.quantity}</span>}
        {item.weightLb !== undefined && <span className="gear-item__weight">{item.weightLb} lb</span>}
        {item.cost && <span className="gear-item__cost">{item.cost}</span>}
        {item.attuned && <span className="chip gear-item__attuned">Attuned</span>}
      </div>
      {item.summary && (
        <div className="gear-item__summary">
          <MarkupText source={item.summary} />
        </div>
      )}
    </div>
  )
}

/** One gear/component/magic-item row: future-grayed + badged in Build view, plain otherwise. */
function ItemRow({ item }: { item: Item }) {
  const { viewMode, isFuture } = useCharacter()
  if (viewMode === 'build' && isFuture(item.unlockLevel)) {
    return (
      <li className="gear-item-wrap gear-item-wrap--future">
        <FutureWrap level={item.unlockLevel ?? 1}>
          <ItemRowBody item={item} />
        </FutureWrap>
      </li>
    )
  }
  return (
    <li className="gear-item-wrap">
      <ItemRowBody item={item} />
    </li>
  )
}

/** An in-session found item (D2, T15): quantity/weight join the sheet, a note if given, with edit/remove. */
function AdditionRow({ addition }: { addition: Addition }) {
  const quantity = addition.quantity ?? 1
  return (
    <li className="gear-item-wrap">
      <div className="gear-item gear-item--addition">
        <div className="gear-item__head">
          <span className="gear-item__name">{addition.name}</span>
          {quantity > 1 && <span className="gear-item__qty">×{quantity}</span>}
          {addition.weightLb !== undefined && (
            <span className="gear-item__weight">{addition.weightLb} lb</span>
          )}
          <SessionMarker />
          <AdditionControls addition={addition} />
        </div>
        {addition.summary && (
          <div className="gear-item__summary">
            <MarkupText source={addition.summary} />
          </div>
        )}
      </div>
    </li>
  )
}

function ItemSection({
  title,
  items,
  additions,
}: {
  title: string
  items: Item[]
  additions?: Addition[]
}) {
  const { isVisible } = useCharacter()
  const visible = items.filter((item) => isVisible(item.unlockLevel))
  if (visible.length === 0 && !additions?.length) return null
  return (
    <div className="gear-section">
      <h3 className="gear-section__title">{title}</h3>
      <ul className="gear-item-list">
        {visible.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
        {additions?.map((addition) => (
          <AdditionRow key={addition.id} addition={addition} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Gear, spell components, and magic items (T11 IA). The schema carries no
 * per-item section discriminator, so items are bucketed by the library
 * extract's `type` via `groupItems` (documented there — no schema change).
 * In-session "found item" additions (D2, rendered here even before T15 builds
 * the add-UI) land in the Gear section with a subtle marker.
 */
export function GearPanel() {
  const { character, isVisible } = useCharacter()
  const { additions } = useSessionState()
  const items = character.equipment?.items ?? []
  const groups = groupItems(items, character.library)
  const itemAdditions = (additions ?? []).filter((a) => a.kind === 'item')

  const anyVisible =
    items.some((i) => isVisible(i.unlockLevel)) || itemAdditions.length > 0
  if (!anyVisible) return null

  return (
    <section className="panel gear" aria-label="Gear">
      <h2 className="panel__title">Gear</h2>
      <ItemSection title="Equipment" items={groups.gear} additions={itemAdditions} />
      <ItemSection title="Components" items={groups.components} />
      <ItemSection title="Magic items" items={groups.magicItems} />
    </section>
  )
}

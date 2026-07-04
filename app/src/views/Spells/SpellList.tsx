import { RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSessionState } from '../../session/SessionProvider'
import { CollapsibleSection } from '../Features/CollapsibleSection'
import { SpellRow } from './SpellRow'
import { groupSpellsByLevel, isSpellShown, levelLabel, sortedSwaps, sourceIndex } from './spellHelpers'

/**
 * Build view's explicit swap-history links (T10 IA): fixed-known casters'
 * `swapOutLevel` + `spellcasting.swaps[]` render as "L5: Ashen Bolt → Frost
 * Splinter" rather than being inferred from `unlockLevel`/`swapOutLevel` pairs.
 */
function SwapHistory() {
  const { character, viewMode } = useCharacter()
  const { openRef } = useLibrary()
  const swaps = sortedSwaps(character.spellcasting?.swaps)
  if (viewMode !== 'build' || swaps.length === 0) return null

  const refOf = (name: string) => character.spellcasting?.spells.find((s) => s.name === name)?.ref

  return (
    <section className="panel spell-swaps" aria-label="Spell swap history">
      <h2 className="panel__title">Swap history</h2>
      <ul className="spell-swaps__list">
        {swaps.map((swap, i) => {
          const outRef = refOf(swap.out)
          const inRef = refOf(swap.in)
          return (
            <li key={i} className="spell-swap">
              <span className="spell-swap__level">L{swap.atLevel}</span>
              {outRef ? <RefLink label={swap.out} onClick={() => openRef(outRef)} /> : swap.out}
              <span className="spell-swap__arrow" aria-hidden="true">
                →
              </span>
              {inRef ? <RefLink label={swap.in} onClick={() => openRef(inRef)} /> : swap.in}
              {swap.note && (
                <div className="spell-swap__note">
                  <MarkupText source={swap.note} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The clean play list (T10 IA): `spellcasting.spells[]` grouped by level
 * (cantrips first), filtered to the current selection + always-prepared
 * spells (D13) — a deselected prepared spell drops off without touching the
 * compiled file. Build view additionally previews future-unlocked spells,
 * grayed + badged, via `SpellRow`.
 */
export function SpellList() {
  const { character, currentLevel, viewMode } = useCharacter()
  const { loadout } = useSessionState()
  const sources = character.spellcasting?.sources ?? []
  const allSpells = character.spellcasting?.spells ?? []
  const idx = sourceIndex(sources)

  if (allSpells.length === 0) return <p className="spells-empty">No spells known.</p>

  const shown = allSpells.filter((s) =>
    isSpellShown(s, currentLevel, viewMode, loadout.pools?.[s.poolRef ?? '']?.selected ?? []),
  )
  const groups = groupSpellsByLevel(shown)

  return (
    <>
      {groups.map((group) => (
        <CollapsibleSection
          key={group.level ?? 'other'}
          title={levelLabel(group.level)}
          className="spell-level-section"
        >
          <ul className="spell-list">
            {group.items.map((spell, i) => (
              <SpellRow key={spell.ref ?? `${spell.name}-${i}`} spell={spell} sourceIndex={idx} sources={sources} />
            ))}
          </ul>
        </CollapsibleSection>
      ))}
      <SwapHistory />
    </>
  )
}

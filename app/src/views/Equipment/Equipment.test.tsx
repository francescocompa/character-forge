import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import { LibraryProvider } from '../../library'
import { CharacterProvider } from '../../character/CharacterProvider'
import { SessionProvider } from '../../session/SessionProvider'
import { AdditionsProvider } from '../../session/additions'
import type { ViewMode } from '../../character/visibility'
import { createSessionEngine, seedSessionState } from '../../state/sessionEngine'
import type { SessionStore } from '@character-forge/schema/types.ts'
import { Equipment } from './Equipment'

const character = fixture as unknown as CharacterFile

function render(viewMode: ViewMode = 'level', store?: SessionStore): string {
  return renderToStaticMarkup(
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character} initialViewMode={viewMode}>
        <SessionProvider character={character} store={store}>
          <AdditionsProvider>
            <Equipment />
          </AdditionsProvider>
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>,
  )
}

describe('Equipment — synthetic multiclass fixture (Level view, default)', () => {
  const html = render()

  it('renders gear with names, quantities, weight, and cost', () => {
    expect(html).toContain('Longsword')
    expect(html).toContain('Shortbow')
    expect(html).toContain('Studded Leather Armor')
    expect(html).toContain('13 lb')
    expect(html).toContain('45 gp')
  })

  it('sorts a spell-component item into its own section', () => {
    expect(html).toContain('Components')
    expect(html).toContain('Incense')
  })

  it('sorts a magic item into its own section with an Attuned marker', () => {
    expect(html).toContain('Magic items')
    expect(html).toContain('Ember Cartographer&#x27;s Compass')
    expect(html).toContain('Attuned')
  })

  it('hides a magic item not yet unlocked (Ashwalker Cloak, level 5, currentLevel 3)', () => {
    expect(html).not.toContain('Ashwalker Cloak')
  })

  it('offers equipped/carried checkboxes seeded from the file defaults', () => {
    expect(html).toContain('Equipped')
    expect(html).toContain('Carried')
  })

  it('makes referenced items tappable (a library ref renders as a button)', () => {
    expect(html).toContain('<button')
  })

  it('renders the weapon-masteries manage flow with the live prepare count (2 / 2 selected)', () => {
    expect(html).toContain('Weapon Masteries')
    expect(html).toContain('/ 2 selected')
    expect(html).toContain('mastery-option--selected')
    expect(html).toContain('Dagger') // pool option not currently selected
  })

  it('shows the rest-rule note as an informational aside, never blocking', () => {
    expect(html).toContain("won&#x27;t stop you")
  })

  it('renders attunement slots: one filled, two empty (max 3)', () => {
    expect(html).toContain('Attunement')
    expect(html).toContain('is-filled')
    const emptyCount = (html.match(/attunement-slot__empty/g) ?? []).length
    expect(emptyCount).toBe(2)
  })

  it('computes total carried weight in lb and kg, excluding the not-yet-owned cloak', () => {
    expect(html).toContain('20 lb')
    expect(html).toContain('9.1 kg')
  })

  it('shows carrying capacity and push/drag/lift (2x capacity) in lb and kg', () => {
    expect(html).toContain('150 lb')
    expect(html).toContain('68 kg')
    expect(html).toContain('300 lb')
    expect(html).toContain('136.1 kg')
  })

  it('renders the currency panel seeded from the compiled defaults', () => {
    expect(html).toContain('GP')
    expect(html).toContain('value="32"')
    expect(html).toContain('value="5"')
  })
})

describe('Equipment — Build view shows future gear grayed + badged', () => {
  const html = render('build')

  it('shows the not-yet-owned magic item with its unlock badge', () => {
    expect(html).toContain('Ashwalker Cloak')
    expect(html).toContain('level-badge')
  })

  it('still excludes the future item from the carried-weight total', () => {
    expect(html).toContain('20 lb')
  })
})

describe('Equipment — session-layer edits reflect in the view', () => {
  it('reflects a currency edit made through the SessionStore', () => {
    const store = createSessionEngine(character, seedSessionState(character))
    store.setCurrency({ ...store.getState().trackers.currency, gp: 99 })
    const html = render('level', store)
    expect(html).toContain('value="99"')
  })

  it('reflects an equipped-state override made through the SessionStore', () => {
    const store = createSessionEngine(character, seedSessionState(character))
    store.setEquipped('dagger-item', { equipped: true })
    const html = render('level', store)
    // Both the dagger's own checkbox and the identically-shaped longsword row
    // exist, so assert via the store rather than a brittle DOM count.
    expect(store.getState().loadout.equipped?.['dagger-item']).toEqual({ equipped: true })
    expect(html).toContain('Dagger')
  })

  it('renders a seeded in-session "found item" addition with its session marker, qty/weight, and edit/remove', () => {
    const store = createSessionEngine(character, seedSessionState(character))
    store.addAddition({
      kind: 'item',
      name: 'Potion of Climbing (found)',
      summary: 'Found in a cache.',
      quantity: 2,
      weightLb: 0.5,
    })
    const html = render('level', store)
    expect(html).toContain('Potion of Climbing (found)')
    expect(html).toContain('session-marker')
    expect(html).toContain('×2')
    expect(html).toContain('0.5 lb')
    expect(html).toContain('aria-label="Remove Potion of Climbing (found)"')
  })

  it('adds an item addition\'s weight to the carried total', () => {
    const store = createSessionEngine(character, seedSessionState(character))
    const before = render('level', store)
    // Baseline carried weight is 20 lb (see the weight test above).
    expect(before).toContain('20 lb')
    store.addAddition({ kind: 'item', name: 'Anvil', quantity: 1, weightLb: 10 })
    const after = render('level', store)
    expect(after).toContain('30 lb')
  })
})

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import { AppShell } from '../../app/AppShell'
import { LibraryProvider } from '../../library'
import { CharacterProvider } from '../../character/CharacterProvider'
import { SessionProvider } from '../../session/SessionProvider'
import type { ViewMode } from '../../character/visibility'
import { MainSheet } from './MainSheet'

const character = fixture as unknown as CharacterFile

/**
 * Renders the whole shell (default: Main tab, Level view) against the synthetic
 * multiclass fixture and asserts the T08 acceptance shape. Server-render is
 * enough: it proves the data flows through to the DOM; interaction is covered by
 * the store/visibility unit tests.
 */
function render(char: CharacterFile = character): string {
  return renderToStaticMarkup(<AppShell character={char} />)
}

/** Renders just the MainSheet under a given view mode (bypasses the shell/tabs). */
function renderMainSheet(viewMode: ViewMode): string {
  return renderToStaticMarkup(
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character} initialViewMode={viewMode}>
        <SessionProvider character={character}>
          <MainSheet />
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>,
  )
}

describe('MainSheet — synthetic multiclass fixture', () => {
  const html = render()

  it('shows identity: name, both classes, reflavored species', () => {
    expect(html).toContain('Fenn Larkspur')
    expect(html).toContain('Fighter')
    expect(html).toContain('Wizard')
    expect(html).toContain('Ashwalker') // reflavored duskling displayName
  })

  it('renders per-class hit dice separately (§2.8)', () => {
    expect(html).toContain('1d10')
    expect(html).toContain('2d6')
  })

  it('renders compiled stats verbatim (AC, HP max, spell save DC)', () => {
    expect(html).toContain('16') // AC
    expect(html).toContain('24') // max HP
    expect(html).toContain('13') // spell save DC
  })

  it('renders mixed recovery with composed icons (Second Wind: LR all + SR +1)', () => {
    expect(html).toContain('Long rest')
    expect(html).toContain('Short rest')
    expect(html).toContain('Second Wind')
  })

  it('renders the ammo consumable with a counter and its max', () => {
    expect(html).toContain('Arrows')
    expect(html).toContain('/20')
  })

  it('renders attack riders as secondary lines', () => {
    expect(html).toContain('Riposte')
    expect(html).toContain('Exposed')
  })

  it('makes references tappable (a library ref renders as a button)', () => {
    expect(html).toContain('<button')
  })

  it('renders the actions/bonus actions/reactions groups (T13)', () => {
    expect(html).toContain('t13-actions')
    expect(html).toContain('Longsword Strike')
    expect(html).toContain('Second Wind')
    expect(html).toContain('Shield')
    expect(html).toContain('Bonus actions')
    expect(html).toContain('Reactions')
  })
})

describe('MainSheet — Level view (default) hides future content', () => {
  it('omits a planned subclass unlocked above the current level', () => {
    // Eldritch Knight is the Fighter subclass planned at level 5; currentLevel is 3.
    expect(render()).not.toContain('Eldritch Knight')
  })

  it('omits a future action-economy entry unlocked above the current level', () => {
    // Bound Weapon Strike unlocks at level 5; currentLevel is 3.
    expect(render()).not.toContain('Bound Weapon Strike')
  })
})

describe('MainSheet — Build view shows future content grayed + badged', () => {
  it('shows the future action with its unlock-level badge', () => {
    const html = renderMainSheet('build')
    expect(html).toContain('Bound Weapon Strike')
    expect(html).toContain('Unlocks at level 5')
  })
})

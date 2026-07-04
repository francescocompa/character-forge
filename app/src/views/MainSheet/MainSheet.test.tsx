import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import { AppShell } from '../../app/AppShell'

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

  it('leaves a clean T13 actions slot', () => {
    expect(html).toContain('t13-actions')
  })
})

describe('MainSheet — Level view (default) hides future content', () => {
  it('omits a planned subclass unlocked above the current level', () => {
    // Eldritch Knight is the Fighter subclass planned at level 5; currentLevel is 3.
    expect(render()).not.toContain('Eldritch Knight')
  })
})

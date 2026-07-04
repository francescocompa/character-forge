import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import { LibraryProvider } from '../../library'
import { CharacterProvider } from '../../character/CharacterProvider'
import { SessionProvider } from '../../session/SessionProvider'
import type { ViewMode } from '../../character/visibility'
import { Features } from './Features'

const character = fixture as unknown as CharacterFile

function render(viewMode: ViewMode = 'level'): string {
  return renderToStaticMarkup(
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character} initialViewMode={viewMode}>
        <SessionProvider character={character}>
          <Features />
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>,
  )
}

describe('Features — synthetic multiclass fixture (Level view, default)', () => {
  const html = render()

  it('renders one section per class with its proficiency header line', () => {
    expect(html).toContain('Fighter')
    expect(html).toContain('Starting class')
    expect(html).toContain('Wizard')
    expect(html).toContain('Multiclass grant')
  })

  it('groups core features and subclass features per class', () => {
    expect(html).toContain('Fighting Style: Defense')
    expect(html).toContain('Second Wind')
    expect(html).toContain('Arcane Recovery')
    expect(html).toContain('War Magic')
  })

  it('hides a subclass not yet unlocked (Eldritch Knight, level 5, currentLevel 3)', () => {
    expect(html).not.toContain('Eldritch Knight')
  })

  it('renders the reflavored species with its source tag and traits', () => {
    expect(html).toContain('Ashwalker')
    expect(html).toContain('Umbral Step')
  })

  it('renders the background with its granted tools and a link to its feat', () => {
    expect(html).toContain('Ember Cartographer')
    expect(html).toContain('chassis-section__tools')
    expect(html).toContain('cartographer&#x27;s tools')
    expect(html).toContain('Tireless Cartographer')
  })

  it('renders the Feats section and hides the future ASI slot', () => {
    expect(html).toContain('Feats')
    expect(html).not.toContain('Ability Score Improvement')
  })

  it('makes references tappable (a library ref renders as a button)', () => {
    expect(html).toContain('<button')
  })
})

describe('Features — Build view shows future content grayed + badged', () => {
  const html = render('build')

  it('shows the future subclass and ASI slot with their unlock badges', () => {
    expect(html).toContain('Eldritch Knight')
    expect(html).toContain('Ability Score Improvement')
    expect(html).toContain('level-badge')
  })
})

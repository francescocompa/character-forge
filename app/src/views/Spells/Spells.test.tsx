import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import { LibraryProvider } from '../../library'
import { CharacterProvider } from '../../character/CharacterProvider'
import { SessionProvider } from '../../session/SessionProvider'
import type { ViewMode } from '../../character/visibility'
import { Spells } from './Spells'
import { ManageMode } from './ManageMode'

const character = fixture as unknown as CharacterFile

function render(viewMode: ViewMode = 'level'): string {
  return renderToStaticMarkup(
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character} initialViewMode={viewMode}>
        <SessionProvider character={character}>
          <Spells />
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>,
  )
}

function renderManageMode(): string {
  return renderToStaticMarkup(
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character}>
        <SessionProvider character={character}>
          <ManageMode />
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>,
  )
}

describe('Spells — synthetic multiclass fixture (Level view, default)', () => {
  const html = render()

  it('renders a casting header per source with distinct origin dots and DCs', () => {
    expect(html).toContain('Wizard')
    expect(html).toContain('DC 13')
    expect(html).toContain('Ember Cartographer&#x27;s Compass')
    expect(html).toContain('DC 14')
  })

  it('renders both slot pools at 1st level with their recovery icons', () => {
    expect(html).toContain('Wizard Slots')
    expect(html).toContain('Long rest')
    expect(html).toContain('Arcane Font')
    expect(html).toContain('Short rest')
  })

  it('shows the current selection and always-available spells, grouped cantrips first', () => {
    expect(html).toContain('Guiding Flame') // innate cantrip, always shown
    expect(html).toContain('Mending Charm') // prepared, selected by default
    expect(html).toContain('Ashen Bolt') // prepared, selected by default
    expect(html).toContain('Cantrips')
    expect(html).toContain('1st level')
  })

  it('hides a future known spell not yet unlocked (Frost Splinter, level 5)', () => {
    expect(html).not.toContain('Frost Splinter')
  })

  it('renders concentration and ritual flags', () => {
    expect(html).toContain('spell-flag')
  })

  it('renders a two-tone origin dot for the dual-source spell (Ashen Bolt)', () => {
    expect(html).toContain('origin-dot--dual')
  })

  it('hides the swap-history section outside Build view', () => {
    expect(html).not.toContain('Swap history')
  })

  it('offers the manage-spells toggle for the wizard prepared pool', () => {
    expect(html).toContain('Manage spells')
  })
})

describe('Spells — Build view', () => {
  const html = render('build')

  it('shows the future known spell grayed with its unlock badge', () => {
    expect(html).toContain('Frost Splinter')
    expect(html).toContain('level-badge')
  })

  it('shows the swap-history link for the fixed-known swap', () => {
    expect(html).toContain('Swap history')
    expect(html).toContain('L5')
    expect(html).toContain('Ashen Bolt')
  })
})

describe('Spells — manage mode (rendered directly; the play/manage switch is client state)', () => {
  const html = renderManageMode()

  it('lists the wizard prepared pool with its name and live prepare count (2 selected / 4 max)', () => {
    expect(html).toContain('Wizard prepared spells')
    expect(html).toContain('2')
    expect(html).toContain('/ 4 prepared')
  })

  it('shows every pool option, including one not currently selected (Featherfall Ward)', () => {
    expect(html).toContain('Mending Charm')
    expect(html).toContain('Ashen Bolt')
    expect(html).toContain('Featherfall Ward')
  })

  it('highlights the currently-selected options and groups the unmatched one under Other', () => {
    expect(html).toContain('manage-option--selected')
    expect(html).toContain('Other')
  })

  it('shows the rest-rule note as an informational aside, never blocking', () => {
    expect(html).toContain('won&#x27;t stop you')
  })
})

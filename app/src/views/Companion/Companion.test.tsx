import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import variantFixture from '../../../../fixtures/synthetic-variant.character.json'
import { AppShell } from '../../app/AppShell'
import { LibraryProvider } from '../../library'
import { CharacterProvider } from '../../character/CharacterProvider'
import { SessionProvider } from '../../session/SessionProvider'
import { createSessionEngine, seedSessionState } from '../../state/sessionEngine'
import type { SessionStore } from '@character-forge/schema/types.ts'
import { Companion } from './Companion'

const character = fixture as unknown as CharacterFile

function renderView(store?: SessionStore): string {
  return renderToStaticMarkup(
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character}>
        <SessionProvider character={character} store={store}>
          <Companion />
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>,
  )
}

describe('Companion — synthetic fixture (Ember Sprite, the CI path)', () => {
  const html = renderView()

  it('renders identity, abilities, AC/HP, speeds, saves, and skills', () => {
    expect(html).toContain('Ember Sprite')
    expect(html).toContain('−4') // STR modifier
    expect(html).toContain('+3') // DEX modifier
    expect(html).toContain('13') // AC
    expect(html).toContain('/ 5') // max HP
    expect(html).toContain('30') // fly speed
    expect(html).toContain('Stealth')
  })

  it('renders the attack with markup-rendered damage', () => {
    expect(html).toContain('Ember Touch')
    expect(html).toContain('+4')
  })

  it('renders the feature as a tappable library ref', () => {
    expect(html).toContain('Flicker')
    expect(html).toContain('<button')
  })

  it('renders senses and languages', () => {
    expect(html).toContain('Darkvision 60 ft')
    expect(html).toContain('Ignan')
  })

  it('has no companion switcher with only one companion', () => {
    expect(html).not.toContain('companion-switcher')
  })
})

describe('Companion — HP tracking is independent of the main character', () => {
  it('setting the companion HP does not touch the main character HP tracker', () => {
    const store = createSessionEngine(character, seedSessionState(character))
    store.setCurrentHp(2, { owner: 'ember-sprite' })
    const state = store.getState()
    expect(state.companions?.['ember-sprite']?.hp?.current).toBe(2)
    expect(state.trackers.hp?.current).not.toBe(2)
    const html = renderView(store)
    expect(html).toContain('Ember Sprite')
  })
})

describe('Companion tab — hidden when the character has no companions', () => {
  it('omits the Companion tab button', () => {
    const noCompanions = { ...character, companions: [] } as CharacterFile
    const html = renderToStaticMarkup(<AppShell character={noCompanions} />)
    expect(html).not.toContain('>Companion<')
  })

  it('shows the Companion tab button when companions are present', () => {
    const html = renderToStaticMarkup(<AppShell character={character} />)
    expect(html).toContain('>Companion<')
  })
})

describe('Companion — variant fixture also carries the companion (CI path)', () => {
  it('renders Ember Sprite from the variant fixture too', () => {
    const variant = variantFixture as unknown as CharacterFile
    const html = renderToStaticMarkup(
      <LibraryProvider library={variant.library}>
        <CharacterProvider character={variant}>
          <SessionProvider character={variant}>
            <Companion />
          </SessionProvider>
        </CharacterProvider>
      </LibraryProvider>,
    )
    expect(html).toContain('Ember Sprite')
  })
})

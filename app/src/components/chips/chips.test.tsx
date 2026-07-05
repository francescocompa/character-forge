import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AbilityChip } from './AbilityChip'
import { AdvBadge } from './AdvBadge'
import { ConditionChip } from './ConditionChip'
import { DamageText } from './DamageText'
import { DisBadge } from './DisBadge'
import { FutureWrap } from './FutureWrap'
import { LevelBadge } from './LevelBadge'
import { OriginDot } from './OriginDot'
import { RecoverIcon } from './RecoverIcon'
import { RefLink } from './RefLink'
import { SaveDCBadge } from './SaveDCBadge'
import { SchoolLabel } from './SchoolLabel'
import { originColor } from './colorMaps'

describe('AbilityChip', () => {
  it('renders the ability abbreviation and an optional value', () => {
    expect(renderToStaticMarkup(<AbilityChip ability="STR" />)).toContain('STR')
    const withValue = renderToStaticMarkup(<AbilityChip ability="DEX" value={14} />)
    expect(withValue).toContain('DEX')
    expect(withValue).toContain('14')
  })
})

describe('SaveDCBadge', () => {
  it('shows DC only when given', () => {
    expect(renderToStaticMarkup(<SaveDCBadge ability="WIS" />)).not.toContain('DC')
    expect(renderToStaticMarkup(<SaveDCBadge ability="WIS" dc={15} />)).toContain('DC 15')
  })
})

describe('DamageText', () => {
  it('covers {dmg:}, {dice:}, and {dtype:} with one component', () => {
    const typed = renderToStaticMarkup(<DamageText type="psychic" dice="1d6" />)
    expect(typed).toContain('1d6')
    expect(typed).toContain('psychic')

    const untyped = renderToStaticMarkup(<DamageText dice="1d4" />)
    expect(untyped).toContain('1d4')

    const bareType = renderToStaticMarkup(<DamageText type="poison" />)
    expect(bareType).toContain('poison')
    expect(bareType).not.toMatch(/\d/)
  })

  it('falls back to the neutral token for an unrecognized type', () => {
    const html = renderToStaticMarkup(<DamageText type="homebrew-flux" dice="1d8" />)
    expect(html).toContain('var(--dmg-neutral)')
  })
})

describe('AdvBadge / DisBadge', () => {
  it('renders a colored die icon labeled for advantage (Francesco\'s "EDGE" shorthand)', () => {
    const html = renderToStaticMarkup(<AdvBadge />)
    expect(html).toContain('Advantage')
    expect(html).toContain('EDGE')
    expect(html).toContain('var(--adv)')
  })

  it('renders a colored die icon labeled for disadvantage', () => {
    const html = renderToStaticMarkup(<DisBadge />)
    expect(html).toContain('Disadvantage')
    expect(html).toContain('var(--dis)')
  })
})

describe('ConditionChip', () => {
  it('renders a plain chip without onClick and a button when tappable', () => {
    expect(renderToStaticMarkup(<ConditionChip name="Frightened" />)).not.toContain('<button')
    expect(
      renderToStaticMarkup(<ConditionChip name="Charmed" onClick={() => undefined} />),
    ).toContain('<button')
  })
})

describe('RecoverIcon', () => {
  it('labels each trigger for accessibility', () => {
    expect(renderToStaticMarkup(<RecoverIcon when="LR" />)).toContain('Long rest')
    expect(renderToStaticMarkup(<RecoverIcon when="SR" />)).toContain('Short rest')
    expect(renderToStaticMarkup(<RecoverIcon when="Dawn" />)).toContain('Dawn')
  })
})

describe('LevelBadge', () => {
  it('renders the numeral and an accessible label', () => {
    const html = renderToStaticMarkup(<LevelBadge level={6} />)
    expect(html).toContain('>6<')
    expect(html).toContain('Unlocks at level 6')
  })
})

describe('OriginDot', () => {
  it('wraps the palette index and carries the label for a11y', () => {
    const html = renderToStaticMarkup(<OriginDot label="Celestial Warlock" index={0} />)
    expect(html).toContain('Celestial Warlock')
    expect(originColor(0)).toBe(originColor(6))
  })

  it("renders a two-tone, bordered dot for a dual-source spell (§2.8, e.g. Vice's Hex)", () => {
    const html = renderToStaticMarkup(
      <OriginDot label="Wizard + Ember Cartographer's Compass" index={0} secondaryIndex={1} />,
    )
    expect(html).toContain('origin-dot--dual')
    expect(html).toContain('Wizard + Ember Cartographer&#x27;s Compass')
  })
})

describe('SchoolLabel', () => {
  it('renders the school name', () => {
    expect(renderToStaticMarkup(<SchoolLabel school="Evocation" />)).toContain('Evocation')
  })
})

describe('RefLink', () => {
  it('renders a button when tappable, plain text otherwise', () => {
    expect(
      renderToStaticMarkup(<RefLink label="Mind Sliver" onClick={() => undefined} />),
    ).toContain('<button')
    expect(renderToStaticMarkup(<RefLink label="Mind Sliver" />)).not.toContain('<button')
  })
})

describe('FutureWrap', () => {
  it('renders the level badge alongside the wrapped content', () => {
    const html = renderToStaticMarkup(<FutureWrap level={11}>Second Wind</FutureWrap>)
    expect(html).toContain('Second Wind')
    expect(html).toContain('Unlocks at level 11')
  })
})

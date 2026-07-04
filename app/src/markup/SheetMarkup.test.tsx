import { isValidElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SheetMarkup } from './SheetMarkup'
import { RefLink } from '../components/chips'

const html = (source: string, onRef?: (k: string) => void): string =>
  renderToStaticMarkup(<SheetMarkup source={source} onRef={onRef} />)

describe('SheetMarkup — node type coverage', () => {
  it('renders plain text', () => {
    expect(html('just prose')).toBe('just prose')
  })

  it('maps {a:ABIL} to an ability chip', () => {
    expect(html('{a:CHA}')).toContain('CHA')
  })

  it('maps {save:ABIL} and {save:ABIL|DC}', () => {
    expect(html('{save:WIS}')).not.toContain('DC')
    expect(html('{save:INT|13}')).toContain('DC 13')
  })

  it('maps the damage family: {dmg:}, {dice:}, {dtype:}', () => {
    const dmg = html('{dmg:psychic|1d6}')
    expect(dmg).toContain('1d6')
    expect(dmg).toContain('psychic')
    expect(html('{dice:1d4}')).toContain('1d4')
    const dtype = html('{dtype:poison}')
    expect(dtype).toContain('poison')
    expect(dtype).not.toMatch(/\d/)
  })

  it('maps {adv} and {dis} to their dice icons', () => {
    expect(html('{adv}')).toContain('Advantage')
    expect(html('{dis}')).toContain('Disadvantage')
  })

  it('maps {cond:NAME} to a condition chip (plain until T07 wires popovers)', () => {
    const out = html('{cond:charmed}')
    expect(out).toContain('charmed')
    expect(out).not.toContain('<button')
  })

  it('maps {recover:WHEN} to the recovery icon with an accessible label', () => {
    expect(html('{recover:LR}')).toContain('Long rest')
    expect(html('{recover:SR}')).toContain('Short rest')
    expect(html('{recover:Dawn}')).toContain('Dawn')
  })

  it('maps {lvl:N} to the unlock-level badge', () => {
    expect(html('{lvl:6}')).toContain('Unlocks at level 6')
  })

  it('maps {ref:KEY} showing the key, {ref:KEY|LABEL} showing the label', () => {
    expect(html('{ref:mind-sliver}')).toContain('mind-sliver')
    expect(html('{ref:fey-pact|Fey Pact}')).toContain('Fey Pact')
  })

  it('maps {note:TEXT} to a muted inline note', () => {
    const out = html('{note:once per turn}')
    expect(out).toContain('once per turn')
    expect(out).toContain('markup-note')
  })

  it('passes markdown emphasis through as <strong>/<em>, wrapping tags', () => {
    expect(html('**bold**')).toContain('<strong>bold</strong>')
    expect(html('*soft*')).toContain('<em>soft</em>')
    expect(html('**{a:STR}**')).toMatch(/<strong>.*STR.*<\/strong>/)
  })
})

describe('SheetMarkup — {ref:} interactivity', () => {
  it('renders a tappable button when onRef is provided', () => {
    expect(html('{ref:mind-sliver|Mind Sliver}', () => undefined)).toContain('<button')
  })

  it('renders styled text (no button) when onRef is absent', () => {
    expect(html('{ref:mind-sliver|Mind Sliver}')).not.toContain('<button')
  })

  it('fires onRef with the library key (not the label) when the term is activated', () => {
    const onRef = vi.fn()
    const tree = SheetMarkup({ source: 'see {ref:fey-pact|Fey Pact}', onRef })
    const refLink = findElement(tree, (el) => el.type === RefLink)
    expect(refLink).not.toBeNull()
    ;(refLink?.props as { onClick?: () => void }).onClick?.()
    expect(onRef).toHaveBeenCalledTimes(1)
    expect(onRef).toHaveBeenCalledWith('fey-pact')
  })
})

describe('SheetMarkup — graceful degradation (grammar §2)', () => {
  it('renders an unknown tag as literal text', () => {
    // The parser turns {foo:bar} into a text node, so it round-trips verbatim.
    expect(html('{foo:bar}')).toContain('{foo:bar}')
  })

  it('degrades a known tag with invalid args to its arg text (flagged in dev)', () => {
    const out = html('{a:LUCK}')
    expect(out).toContain('LUCK')
    // Dev build flags it; the point is it never crashes and stays readable.
    expect(out).not.toContain('chip ability-chip')
  })

  it('degrades a non-integer {lvl:} without crashing', () => {
    expect(html('{lvl:six}')).toContain('six')
  })
})

describe('SheetMarkup — composite lines (snapshots)', () => {
  it('renders a Mind Sliver-style cantrip line', () => {
    expect(
      html(
        '{dmg:psychic|1d6} & {save:INT|13} — on a fail, target subtracts {dice:1d4} from its next save',
      ),
    ).toMatchSnapshot()
  })

  it('renders a mixed-recovery resource line', () => {
    expect(
      html('Regain {dice:1d10+5} HP. **2** uses per {recover:LR}; regain **1** use on a {recover:SR}.'),
    ).toMatchSnapshot()
  })

  it('renders a reflavored feature with a library link', () => {
    expect(html('{ref:fey-pact|Fey Pact}: {adv} on {save:WIS} against being {cond:charmed}')).toMatchSnapshot()
  })
})

/** Depth-first search for the first React element in a rendered tree matching `pred`. */
function findElement(
  node: ReactNode,
  pred: (el: { type: unknown; props: Record<string, unknown> }) => boolean,
): { type: unknown; props: Record<string, unknown> } | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findElement(child, pred)
      if (hit) return hit
    }
    return null
  }
  if (!isValidElement(node)) return null
  const el = node as { type: unknown; props: Record<string, unknown> }
  if (pred(el)) return el
  return findElement(el.props.children as ReactNode, pred)
}

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ExtractMarkdown } from './ExtractMarkdown'

describe('ExtractMarkdown', () => {
  it('renders headings, lists, and paragraphs as semantic HTML', () => {
    const html = renderToStaticMarkup(
      <ExtractMarkdown source={'# Title\n\nbody text\n\n- one\n- two'} />,
    )
    expect(html).toContain('<h1')
    expect(html).toContain('Title')
    expect(html).toContain('<p')
    expect(html).toContain('body text')
    expect(html).toContain('<ul')
    expect(html).toContain('<li>')
  })

  it('renders GFM tables with header and cells', () => {
    const html = renderToStaticMarkup(
      <ExtractMarkdown source={'| Level | Uses |\n|:--|:-:|\n| 3rd | 1 |'} />,
    )
    expect(html).toContain('<table')
    expect(html).toContain('<th')
    expect(html).toContain('Level')
    expect(html).toContain('<td')
    expect(html).toContain('3rd')
  })

  it('routes inline text through SheetMarkup (bold + chips render)', () => {
    const html = renderToStaticMarkup(
      <ExtractMarkdown source={'deal **extra** {dmg:radiant|1d4} damage'} />,
    )
    expect(html).toContain('<strong>extra</strong>')
    expect(html).toContain('1d4')
    expect(html).toContain('radiant')
  })

  it('wires onRef so a ref inside an extract is a tappable button', () => {
    const refs: string[] = []
    const html = renderToStaticMarkup(
      <ExtractMarkdown
        source="see {ref:gloaming-step|Gloaming Step}"
        onRef={(k) => refs.push(k)}
      />,
    )
    expect(html).toContain('<button')
    expect(html).toContain('Gloaming Step')
  })
})

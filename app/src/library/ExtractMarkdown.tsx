import { Fragment, useMemo } from 'react'
import { SheetMarkup } from '../markup/SheetMarkup'
import { parseMarkdown, type Align, type Block } from './markdown'

/**
 * Renders a library extract's markdown (T07). Block structure comes from the
 * tiny GFM parser; every inline run is handed to `SheetMarkup` (T06) so bold,
 * italics, and — importantly — `{ref:…}` links inside an extract keep working
 * (the popover's "ref inside a ref" case). `onRef` is threaded through so a
 * tapped term can replace the surface content in place.
 */
export interface ExtractMarkdownProps {
  source: string
  onRef?: (refKey: string) => void
}

const ALIGN_STYLE: Record<Align, 'left' | 'center' | 'right' | undefined> = {
  left: 'left',
  center: 'center',
  right: 'right',
  none: undefined,
}

function BlockView({ block, onRef }: { block: Block; onRef?: (refKey: string) => void }) {
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${Math.min(block.level, 6)}` as 'h1'
      return (
        <Tag className={`md-h md-h${block.level}`}>
          <SheetMarkup source={block.text} onRef={onRef} />
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p className="md-p">
          <SheetMarkup source={block.text} onRef={onRef} />
        </p>
      )
    case 'code':
      return (
        <pre className="md-code">
          <code>{block.text}</code>
        </pre>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List className="md-list">
          {block.items.map((item, i) => (
            <li key={i}>
              <SheetMarkup source={item} onRef={onRef} />
            </li>
          ))}
        </List>
      )
    }
    case 'table': {
      const { header, align, rows } = block.table
      return (
        <div className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {header.map((cell, c) => (
                  <th key={c} style={{ textAlign: ALIGN_STYLE[align[c] ?? 'none'] }}>
                    <SheetMarkup source={cell} onRef={onRef} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} style={{ textAlign: ALIGN_STYLE[align[c] ?? 'none'] }}>
                      <SheetMarkup source={cell} onRef={onRef} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }
}

export function ExtractMarkdown({ source, onRef }: ExtractMarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(source), [source])
  return (
    <>
      {blocks.map((block, i) => (
        <Fragment key={i}>
          <BlockView block={block} onRef={onRef} />
        </Fragment>
      ))}
    </>
  )
}

import { SheetMarkup } from '../markup/SheetMarkup'
import { useLibrary } from './LibraryProvider'

export interface MarkupTextProps {
  source: string
}

/**
 * Sheet-markup wired to the library popover: renders a `summary`/`damage`/`note`
 * string with its colored chips, and makes every `{ref:…}` open the embedded
 * extract. The shared way views (T08–T13) render markup — they never wire
 * `onRef` themselves. Must render inside a {@link LibraryProvider}.
 */
export function MarkupText({ source }: MarkupTextProps) {
  const { openRef } = useLibrary()
  return <SheetMarkup source={source} onRef={openRef} />
}

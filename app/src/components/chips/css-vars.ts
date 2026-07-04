import type { CSSProperties } from 'react'

/** CSSProperties plus arbitrary custom-property keys, for token-driven inline styles. */
export type CSSVarStyle = CSSProperties & Record<`--${string}`, string>

import type { ReactNode } from 'react'
import { LevelBadge } from './LevelBadge'

export interface FutureWrapProps {
  level: number
  children: ReactNode
}

/**
 * Build-view grayed treatment (D14): reduced opacity + desaturation, plus the
 * unlock-level badge. Views only render this for `unlockLevel > currentLevel`
 * in Build view — Level view skips it (and the content) entirely.
 */
export function FutureWrap({ level, children }: FutureWrapProps) {
  return (
    <span className="future-wrap">
      <LevelBadge level={level} />
      {children}
    </span>
  )
}

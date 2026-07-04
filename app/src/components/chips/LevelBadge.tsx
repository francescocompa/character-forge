export interface LevelBadgeProps {
  level: number
}

/** `{lvl:N}` — numbered unlock-level badge (matches Build-view graying, D14). */
export function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <span className="level-badge" aria-label={`Unlocks at level ${level}`}>
      {level}
    </span>
  )
}

import type { CSSVarStyle } from './css-vars'

export type RecoverTrigger = 'SR' | 'LR' | 'Dawn'

const LABEL: Record<RecoverTrigger, string> = {
  SR: 'Short rest',
  LR: 'Long rest',
  Dawn: 'Dawn',
}

const COLOR_VAR: Record<RecoverTrigger, string> = {
  SR: 'var(--recover-sr)',
  LR: 'var(--recover-lr)',
  Dawn: 'var(--recover-dawn)',
}

/** `{recover:WHEN}` — sun (SR) / moon (LR) / sunrise (Dawn), inline in prose. */
export function RecoverIcon({ when }: { when: RecoverTrigger }) {
  const style: CSSVarStyle = { '--chip-fg': COLOR_VAR[when] }
  return (
    <svg
      className="recover-icon"
      style={style}
      viewBox="0 0 16 16"
      role="img"
      aria-label={LABEL[when]}
      fill="var(--chip-fg)"
    >
      {when === 'LR' && <path d="M9.5 2a6 6 0 1 0 4.5 9.9A5 5 0 0 1 9.5 2Z" />}
      {when === 'SR' && <circle cx="8" cy="8" r="4" />}
      {when === 'Dawn' && (
        <>
          <path d="M4 9a4 4 0 0 1 8 0Z" />
          <rect x="3" y="11" width="10" height="1.4" rx="0.7" />
        </>
      )}
    </svg>
  )
}

/**
 * Types for the ported physics/paint engine (`engine.js`). The engine is kept as JS (T24 permits this for the
 * core) and accesses three.js / cannon.js as script-injected globals; this declaration is the typed boundary
 * the TS side (index.ts) talks to.
 */

/** Descriptor handed to `rollDice3D` — the caller has already rolled the values and embedded them in `parts`. */
export interface DiceDesc {
  /** Parts string in the engine grammar, e.g. `"2d20kh1:[15,8]"` or `"1d8:[6]"`. Values are what's shown. */
  parts: string
  /** Total to display on the result card (kept dice + flat mods). */
  total: number
  /** Short label, e.g. "Longsword to hit". */
  label: string
  /** Ready-made card text; falls back to `label` when absent. */
  msg?: string
  /** Nat-max flourish (bloom + sheen). */
  crit?: boolean
  /** Re-run the identical roll (wired to the reroll button on the card). */
  reroll?: () => void
}

/** Supply the vendor base URL (where three/cannon/vecna live) so the engine works under the Pages sub-path. */
export function configureDice(opts: { base: string }): void

/** True once three.js + cannon.js globals are present (lazy-loaded on first roll intent). */
export function d3dLibsReady(): boolean

/** Inject the vendored three/cannon blobs off the boot path. Idempotent; resolves false without a document. */
export function d3dLoadLibs(): Promise<boolean>

/**
 * Render a 3D roll. Returns true if it took over the notification (caller skips its 2D toast); false when the
 * reader prefers reduced motion, there are no dice to show, or the libs/WebGL aren't ready yet — the caller
 * then shows the toast fallback.
 */
export function rollDice3D(desc: DiceDesc): boolean

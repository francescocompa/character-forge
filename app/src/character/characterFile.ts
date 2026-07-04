import { useEffect, useState } from 'react'
import type { CharacterFile } from '@character-forge/schema/types.ts'
// The synthetic fixture is the only character bundled into the app: it is the
// CI-safe, WotC-free path (scope §4). Real characters embed KB extracts and are
// never committed, so they never ship in the build. Validated by the T04
// pipeline before it lands, so the app trusts its shape.
import syntheticJson from '../../../fixtures/synthetic.character.json'

export const SYNTHETIC_CHARACTER = syntheticJson as unknown as CharacterFile

/**
 * The character the app renders. Bundles the synthetic fixture as the default
 * (CI + first paint), and — in dev only — tries to swap in a real character
 * dropped at `public/vice.character.json` (gitignored, so it never ships). This
 * is the "develop against the local Vice fixture, fall back to synthetic where
 * Vice is unavailable" path from T08; T16 replaces it with real file import.
 */
export function useCharacterFile(): CharacterFile {
  const [file, setFile] = useState<CharacterFile>(SYNTHETIC_CHARACTER)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    let alive = true
    fetch(`${import.meta.env.BASE_URL}vice.character.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (alive && json) setFile(json as CharacterFile)
      })
      .catch(() => {
        /* No local dev character present — the synthetic default stands. */
      })
    return () => {
      alive = false
    }
  }, [])

  return file
}

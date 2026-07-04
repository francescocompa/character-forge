import type { CharacterFile } from '@character-forge/schema/types.ts'
import type { ValidationIssue } from './types.ts'

const PORTRAIT_MAX_BYTES = 200 * 1024
const FILE_MAX_BYTES = 5 * 1024 * 1024
const FILE_WARN_BYTES = 4 * 1024 * 1024

function byteLength(s: string): number {
  return Buffer.byteLength(s, 'utf8')
}

function checkDuplicateIds(
  items: Array<{ id: string }> | undefined,
  label: string,
): ValidationIssue[] {
  if (!items) return []
  const seenAt = new Map<string, number>()
  const issues: ValidationIssue[] = []
  items.forEach((item, i) => {
    const first = seenAt.get(item.id)
    if (first !== undefined) {
      issues.push({
        layer: 'sanity',
        severity: 'error',
        path: `${label}[${i}].id`,
        message: `duplicate id "${item.id}" (first seen at ${label}[${first}])`,
      })
    } else {
      seenAt.set(item.id, i)
    }
  })
  return issues
}

/** Layer 4: cross-field bounds the schema alone can't express. */
export function checkSanity(file: CharacterFile, rawFileSize: number): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const totalClassLevels = file.chassis.classes.reduce((sum, c) => sum + c.levels, 0)
  if (file.currentLevel > totalClassLevels) {
    issues.push({
      layer: 'sanity',
      severity: 'error',
      path: 'currentLevel',
      message: `currentLevel (${file.currentLevel}) exceeds the sum of chassis.classes[].levels (${totalClassLevels})`,
    })
  }

  issues.push(...checkDuplicateIds(file.spellcasting?.slotPools, 'spellcasting.slotPools'))
  issues.push(...checkDuplicateIds(file.spellcasting?.sources, 'spellcasting.sources'))

  const spellsByName = new Map(file.spellcasting?.spells.map((sp) => [sp.name, sp]))
  file.spellcasting?.spells.forEach((sp, i) => {
    if (sp.swapOutLevel !== undefined && sp.swapOutLevel <= sp.unlockLevel) {
      issues.push({
        layer: 'sanity',
        severity: 'error',
        path: `spellcasting.spells[${i}].swapOutLevel`,
        message: `swapOutLevel (${sp.swapOutLevel}) must be greater than unlockLevel (${sp.unlockLevel})`,
      })
    }
  })
  file.spellcasting?.swaps?.forEach((sw, i) => {
    const base = `spellcasting.swaps[${i}]`
    if (sw.out === sw.in) {
      issues.push({
        layer: 'sanity',
        severity: 'error',
        path: `${base}.in`,
        message: `swap out and in are the same spell ("${sw.in}")`,
      })
    }
    const outSpell = spellsByName.get(sw.out)
    if (outSpell && outSpell.swapOutLevel !== sw.atLevel) {
      issues.push({
        layer: 'sanity',
        severity: 'warning',
        path: `${base}.atLevel`,
        message: `swap atLevel (${sw.atLevel}) does not match "${sw.out}".swapOutLevel (${outSpell.swapOutLevel ?? 'unset'})`,
      })
    }
    const inSpell = spellsByName.get(sw.in)
    if (inSpell && inSpell.unlockLevel !== sw.atLevel) {
      issues.push({
        layer: 'sanity',
        severity: 'warning',
        path: `${base}.atLevel`,
        message: `swap atLevel (${sw.atLevel}) does not match "${sw.in}".unlockLevel (${inSpell.unlockLevel})`,
      })
    }
  })
  issues.push(...checkDuplicateIds(file.resources, 'resources'))
  issues.push(...checkDuplicateIds(file.consumables, 'consumables'))
  issues.push(...checkDuplicateIds(file.equipment?.items, 'equipment.items'))
  issues.push(...checkDuplicateIds(file.companions, 'companions'))

  if (file.pools) {
    for (const [poolId, pool] of Object.entries(file.pools)) {
      const optionRefs = new Set(pool.options.map((o) => o.ref))
      pool.defaults?.forEach((ref, i) => {
        if (!optionRefs.has(ref)) {
          issues.push({
            layer: 'sanity',
            severity: 'error',
            path: `pools.${poolId}.defaults[${i}]`,
            message: `default "${ref}" is not one of pools.${poolId}.options[].ref`,
          })
        }
      })
      if (typeof pool.chooseCount === 'number' && (pool.defaults?.length ?? 0) > pool.chooseCount) {
        issues.push({
          layer: 'sanity',
          severity: 'error',
          path: `pools.${poolId}.defaults`,
          message: `${pool.defaults?.length ?? 0} default selection(s) exceed chooseCount (${pool.chooseCount})`,
        })
      }
    }
  }

  const portraitFields: Array<[string, string | undefined]> = [
    ['meta.portrait', file.meta.portrait],
  ]
  file.companions?.forEach((c, i) => portraitFields.push([`companions[${i}].portrait`, c.portrait]))
  for (const [path, portrait] of portraitFields) {
    if (portrait && byteLength(portrait) > PORTRAIT_MAX_BYTES) {
      issues.push({
        layer: 'sanity',
        severity: 'error',
        path,
        message: `portrait is ${(byteLength(portrait) / 1024).toFixed(0)} KB, over the 200 KB budget`,
      })
    }
  }

  if (rawFileSize > FILE_MAX_BYTES) {
    issues.push({
      layer: 'sanity',
      severity: 'error',
      path: '(file)',
      message: `file is ${(rawFileSize / 1024 / 1024).toFixed(2)} MB, over the 5 MB budget`,
    })
  } else if (rawFileSize > FILE_WARN_BYTES) {
    issues.push({
      layer: 'sanity',
      severity: 'warning',
      path: '(file)',
      message: `file is ${(rawFileSize / 1024 / 1024).toFixed(2)} MB, approaching the 5 MB budget`,
    })
  }

  return issues
}

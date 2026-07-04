import { collectRefTags, parseMarkup } from '@character-forge/schema/markup.ts'
import type { ActionItem, CharacterFile } from '@character-forge/schema/types.ts'
import type { ValidationIssue } from './types.ts'
import { joinPath } from './paths.ts'
import { walkStrings } from './walk.ts'

interface RefUse {
  ref: string
  path: string
}

/** Every structural `ref` field in the character shape (schema/README.md invariant #2). */
function structuralRefs(file: CharacterFile): RefUse[] {
  const uses: RefUse[] = []
  const push = (ref: string | undefined, path: string): void => {
    if (ref) uses.push({ ref, path })
  }

  push(file.chassis.species.ref, 'chassis.species.ref')
  push(file.chassis.background.ref, 'chassis.background.ref')
  file.chassis.classes.forEach((c, i) => {
    const base = joinPath('chassis.classes', i)
    push(c.ref, joinPath(base, 'ref'))
    if (c.subclass) push(c.subclass.ref, joinPath(base, 'subclass') + '.ref')
  })

  file.progression?.forEach((p, i) => {
    const base = joinPath('progression', i)
    push(p.ref, joinPath(base, 'ref'))
    push(p.classRef, joinPath(base, 'classRef'))
  })

  if (file.actionEconomy) {
    const groups = Object.entries(file.actionEconomy) as Array<[string, ActionItem[] | undefined]>
    for (const [group, items] of groups) {
      items?.forEach((item, i) => push(item.ref, `actionEconomy.${group}[${i}].ref`))
    }
  }

  file.attacks?.forEach((atk, i) => {
    const base = joinPath('attacks', i)
    push(atk.ref, joinPath(base, 'ref'))
    atk.riders?.forEach((r, j) => push(r.ref, joinPath(base, 'riders') + `[${j}].ref`))
  })

  if (file.spellcasting) {
    file.spellcasting.sources.forEach((s, i) => {
      const base = joinPath('spellcasting.sources', i)
      push(s.classRef, joinPath(base, 'classRef'))
      push(s.originRef, joinPath(base, 'originRef'))
    })
    file.spellcasting.spells.forEach((sp, i) => {
      push(sp.ref, joinPath('spellcasting.spells', i) + '.ref')
    })
  }

  if (file.pools) {
    for (const [poolId, pool] of Object.entries(file.pools)) {
      pool.options.forEach((opt, i) => push(opt.ref, `pools.${poolId}.options[${i}].ref`))
      pool.defaults?.forEach((ref, i) => push(ref, `pools.${poolId}.defaults[${i}]`))
    }
  }

  file.resources?.forEach((r, i) => push(r.ref, joinPath('resources', i) + '.ref'))
  file.consumables?.forEach((c, i) => push(c.ref, joinPath('consumables', i) + '.ref'))
  file.equipment?.items?.forEach((it, i) => push(it.ref, joinPath('equipment.items', i) + '.ref'))

  file.companions?.forEach((comp, i) => {
    const base = joinPath('companions', i)
    push(comp.ref, joinPath(base, 'ref'))
    comp.attacks?.forEach((atk, j) => {
      const atkBase = joinPath(base, 'attacks') + `[${j}]`
      push(atk.ref, `${atkBase}.ref`)
      atk.riders?.forEach((r, k) => push(r.ref, `${atkBase}.riders[${k}].ref`))
    })
    comp.features?.forEach((f, j) => push(f.ref, joinPath(base, 'features') + `[${j}].ref`))
  })

  return uses
}

/** `{ref:KEY}` tags embedded inside any markup/markdown string in the file. */
function markupRefs(file: unknown): RefUse[] {
  const uses: RefUse[] = []
  walkStrings(file, '', (path, value) => {
    const { nodes } = parseMarkup(value)
    for (const ref of collectRefTags(nodes)) uses.push({ ref, path })
  })
  return uses
}

const LEGAL_EDITIONS = new Set(['2014', '2024', 'UA', 'Homebrew'])

/** Internal id cross-references that aren't `library` refs (schema/README.md invariant #2). */
function internalIdChecks(file: CharacterFile): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const sourceIds = new Set(file.spellcasting?.sources.map((s) => s.id) ?? [])
  const poolIds = new Set(Object.keys(file.pools ?? {}))
  const resourceIds = new Set(file.resources?.map((r) => r.id) ?? [])
  const consumableIds = new Set(file.consumables?.map((c) => c.id) ?? [])

  const spellNames = new Set(file.spellcasting?.spells.map((sp) => sp.name) ?? [])

  file.spellcasting?.spells.forEach((sp, i) => {
    const base = joinPath('spellcasting.spells', i)
    sp.origins.forEach((originId, k) => {
      if (!sourceIds.has(originId)) {
        issues.push({
          layer: 'referential',
          severity: 'error',
          path: `${base}.origins[${k}]`,
          message: `origin "${originId}" does not match any spellcasting.sources[].id`,
        })
      }
    })
    if (sp.poolRef && !poolIds.has(sp.poolRef)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${base}.poolRef`,
        message: `poolRef "${sp.poolRef}" does not match any key in pools`,
      })
    }
  })

  file.spellcasting?.slotPools.forEach((sp, i) => {
    if (sp.sourceId && !sourceIds.has(sp.sourceId)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${joinPath('spellcasting.slotPools', i)}.sourceId`,
        message: `sourceId "${sp.sourceId}" does not match any spellcasting.sources[].id`,
      })
    }
  })

  file.spellcasting?.swaps?.forEach((sw, i) => {
    const base = joinPath('spellcasting.swaps', i)
    if (!spellNames.has(sw.out)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${base}.out`,
        message: `out "${sw.out}" does not match any spellcasting.spells[].name`,
      })
    }
    if (!spellNames.has(sw.in)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${base}.in`,
        message: `in "${sw.in}" does not match any spellcasting.spells[].name`,
      })
    }
    if (sw.sourceId && !sourceIds.has(sw.sourceId)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${base}.sourceId`,
        message: `sourceId "${sw.sourceId}" does not match any spellcasting.sources[].id`,
      })
    }
  })

  if (file.pools) {
    for (const [poolId, pool] of Object.entries(file.pools)) {
      if (pool.sourceId && !sourceIds.has(pool.sourceId)) {
        issues.push({
          layer: 'referential',
          severity: 'error',
          path: `pools.${poolId}.sourceId`,
          message: `sourceId "${pool.sourceId}" does not match any spellcasting.sources[].id`,
        })
      }
    }
  }

  file.progression?.forEach((p, i) => {
    if (p.limitedUseRef && !resourceIds.has(p.limitedUseRef)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${joinPath('progression', i)}.limitedUseRef`,
        message: `limitedUseRef "${p.limitedUseRef}" does not match any resources[].id`,
      })
    }
  })

  file.attacks?.forEach((atk, i) => {
    if (atk.consumableRef && !consumableIds.has(atk.consumableRef)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `${joinPath('attacks', i)}.consumableRef`,
        message: `consumableRef "${atk.consumableRef}" does not match any consumables[].id`,
      })
    }
  })

  return issues
}

/** Layer 2: every `ref` resolves to `library`, every `library` entry is used, entries are well-formed. */
export function checkReferentialIntegrity(file: CharacterFile): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const libraryKeys = new Set(Object.keys(file.library))
  const referenced = new Set<string>()

  for (const use of [...structuralRefs(file), ...markupRefs(file)]) {
    referenced.add(use.ref)
    if (!libraryKeys.has(use.ref)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: use.path,
        message: `ref "${use.ref}" does not resolve to any library entry`,
      })
    }
  }

  for (const key of libraryKeys) {
    if (!referenced.has(key)) {
      issues.push({
        layer: 'referential',
        severity: 'warning',
        path: `library.${key}`,
        message: `library entry "${key}" is never referenced`,
      })
    }
  }

  for (const [key, entry] of Object.entries(file.library)) {
    if (!entry.markdown || !entry.markdown.trim()) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `library.${key}.markdown`,
        message: 'library entry has empty markdown',
      })
    }
    if (!LEGAL_EDITIONS.has(entry.edition)) {
      issues.push({
        layer: 'referential',
        severity: 'error',
        path: `library.${key}.edition`,
        message: `illegal edition "${entry.edition}"`,
      })
    }
  }

  issues.push(...internalIdChecks(file))
  return issues
}

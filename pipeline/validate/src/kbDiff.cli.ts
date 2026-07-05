#!/usr/bin/env -S node --import tsx
import { readFileSync } from 'node:fs'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { diffCharacterLibrary, type KbDiffReport, type KbDiffStatus } from './kbDiff.ts'

function printHelp(): void {
  console.log(`Usage: character-forge-kb-diff <file.character.json> --kb <kb-path> [--json]

Compares a compiled character's embedded \`library\` extracts against the current
knowledge base and reports drift per entry:

  unchanged         embedded text matches the KB (whitespace-normalised)
  changed           embedded text differs — a unified diff is shown
  missing-from-kb   the manifest points at a file that no longer has the block
  not-in-manifest   no KB entry with this name+edition (class-feature sub-extract
                    or a reflavored display name — review by hand, not a deletion)
  homebrew-skipped  Homebrew entry — never checked (it has no KB source)

Options:
  --kb <path>   path to the knowledge base (the dir holding MANIFEST.json). Required.
  --json        emit the machine-readable report (see pipeline/validate/README.md)
  -h, --help    this help

Exit code 0 if nothing needs action (no changed / missing-from-kb); 1 otherwise.
`)
}

function takeOption(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`))
  if (eq) return eq.slice(name.length + 1)
  const i = args.indexOf(name)
  if (i !== -1 && i + 1 < args.length) return args[i + 1]
  return undefined
}

const STATUS_ORDER: KbDiffStatus[] = [
  'changed',
  'missing-from-kb',
  'not-in-manifest',
  'unchanged',
  'homebrew-skipped',
]

function printHuman(report: KbDiffReport): void {
  console.log(`${report.file}`)
  console.log(`  KB: ${report.kbPath}\n`)

  const ranked = [...report.entries].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  )
  for (const e of ranked) {
    console.log(`  [${e.status}] ${e.key} — ${e.name} (${e.edition} · ${e.type} · ${e.source})`)
    if (e.note) console.log(`      note: ${e.note}`)
    if (e.diff) {
      for (const line of e.diff.split('\n')) console.log(`      ${line}`)
    }
  }

  const c = report.counts
  console.log(
    `\n  ${c.changed} changed, ${c['missing-from-kb']} missing-from-kb, ` +
      `${c['not-in-manifest']} not-in-manifest, ${c.unchanged} unchanged, ` +
      `${c['homebrew-skipped']} homebrew — ${report.clean ? 'CLEAN' : 'NEEDS REVIEW'}`,
  )
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp()
    process.exit(args.length === 0 ? 1 : 0)
  }

  const json = args.includes('--json')
  const kbPath = takeOption(args, '--kb')
  const file = args.find((a) => !a.startsWith('-') && a !== kbPath)

  if (!file) {
    console.error('error: no character file given\n')
    printHelp()
    process.exit(1)
  }
  if (!file.endsWith('.character.json')) {
    console.error(`error: expected a *.character.json file, got ${file}`)
    process.exit(1)
  }
  if (!kbPath) {
    console.error('error: --kb <path> is required (the dir holding MANIFEST.json)\n')
    printHelp()
    process.exit(1)
  }

  let character: CharacterFile
  try {
    character = JSON.parse(readFileSync(file, 'utf8')) as CharacterFile
  } catch (err) {
    console.error(`error: could not read ${file}: ${(err as Error).message}`)
    process.exit(1)
  }

  let result: Omit<KbDiffReport, 'file'>
  try {
    result = diffCharacterLibrary(character, kbPath)
  } catch (err) {
    console.error(`error: ${(err as Error).message}`)
    process.exit(1)
  }

  const report: KbDiffReport = { file, ...result }

  if (json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHuman(report)
  }

  process.exit(report.clean ? 0 : 1)
}

main()

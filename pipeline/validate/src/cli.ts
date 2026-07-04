#!/usr/bin/env -S node --import tsx
import { validateFile } from './validate.ts'
import type { ValidationResult } from './types.ts'

function printHelp(): void {
  console.log(`Usage: character-forge-validate <file.character.json|file.session.json> [--json]

Validates a character-forge file against four layers:
  1. schema        ajv (draft 2020-12) against the matching JSON Schema
  2. referential   every ref resolves to library; internal ids cross-check
  3. markup        every sheet-markup string parses without malformed tags
  4. sanity        level/pool/resource/file-size bounds the schema can't express

Exit code 0 if there are no errors (warnings are allowed); 1 otherwise.
See pipeline/validate/README.md for the --json output shape.
`)
}

function printHuman(result: ValidationResult): void {
  console.log(`${result.file} (${result.kind})`)
  if (result.issues.length === 0) {
    console.log('  OK — no issues found.')
    return
  }
  for (const issue of result.issues) {
    const tag = issue.severity === 'error' ? 'ERROR' : 'WARN '
    console.log(`  [${tag}] (${issue.layer}) ${issue.path}: ${issue.message}`)
  }
  console.log(
    `\n${result.errorCount} error(s), ${result.warningCount} warning(s) — ${result.valid ? 'PASS' : 'FAIL'}`,
  )
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp()
    process.exit(args.length === 0 ? 1 : 0)
  }

  const json = args.includes('--json')
  const file = args.find((a) => !a.startsWith('-'))
  if (!file) {
    printHelp()
    process.exit(1)
  }

  const result = validateFile(file)

  if (json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result)
  }

  process.exit(result.valid ? 0 : 1)
}

main()

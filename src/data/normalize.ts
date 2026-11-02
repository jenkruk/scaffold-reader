import type { RawAnchor, RawScaffold, RawScaffoldReaderData, RawStudent } from './rawTypes'
import type {
  Anchor,
  Diagnostic,
  DiagnosticCode,
  LanguageCode,
  LevelRange,
  ProficiencyLevel,
  ReaderData,
  Scaffold,
  ScaffoldContent,
  Student,
} from './types'

/**
 * Outcome of normalizing one field. Failures carry the diagnostic code and a
 * message so the caller can report them without re-deriving the reason.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; code: DiagnosticCode; message: string }

function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

function fail(code: DiagnosticCode, message: string): Result<never> {
  return { ok: false, code, message }
}

// Named levels follow the WIDA 1–6 English language proficiency scale.
const PROFICIENCY_LABELS: Record<string, ProficiencyLevel> = {
  entering: 1,
  emerging: 2,
  developing: 3,
  expanding: 4,
  bridging: 5,
  reaching: 6,
}

export function isProficiencyLevel(value: unknown): value is ProficiencyLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6
}

export function normalizeProficiency(value: unknown): Result<ProficiencyLevel> {
  if (isProficiencyLevel(value)) return ok(value)
  if (typeof value === 'string') {
    const level = PROFICIENCY_LABELS[value.trim().toLowerCase()]
    if (level !== undefined) return ok(level)
  }
  return fail('invalid-proficiency', `Unrecognised proficiency level ${JSON.stringify(value)}`)
}

// Only names we have actually seen in the source. Unknown names are reported, not guessed.
const LANGUAGE_NAMES: Record<string, LanguageCode> = {
  english: 'en',
  spanish: 'es',
  español: 'es',
  vietnamese: 'vi',
}

/** Maps a human-readable language name ("Español") to a base code ("es"). */
export function normalizeLanguageName(value: unknown): Result<LanguageCode> {
  if (typeof value === 'string') {
    // NFC so a decomposed "n + combining tilde" still matches "ñ".
    const code = LANGUAGE_NAMES[value.trim().normalize('NFC').toLowerCase()]
    if (code !== undefined) return ok(code)
  }
  return fail('unknown-language', `Unrecognised language name ${JSON.stringify(value)}`)
}

/** Validates a BCP 47 tag ("es-MX") and derives its base language ("es"). The tag is kept as given. */
export function parseLanguageTag(value: unknown): Result<{ tag: string; base: LanguageCode }> {
  if (typeof value === 'string') {
    try {
      return ok({ tag: value, base: new Intl.Locale(value).language })
    } catch {
      // Intl.Locale throws RangeError for malformed tags; reported below.
    }
  }
  return fail('unknown-language', `Invalid language tag ${JSON.stringify(value)}`)
}

/**
 * Resolves an offset or quote anchor to a character range in the passage.
 * Offsets are applied to the passage exactly as given; quotes must match
 * exactly once (case-sensitive) so we never silently pick the wrong occurrence.
 */
export function resolveAnchor(anchor: RawAnchor, passage: string): Result<Anchor> {
  if ('quote' in anchor) {
    const { quote } = anchor
    if (typeof quote !== 'string' || quote.length === 0) {
      return fail('unresolved-quote-anchor', 'Quote anchor is empty')
    }
    const first = passage.indexOf(quote)
    if (first === -1) {
      return fail('unresolved-quote-anchor', `Quote ${JSON.stringify(quote)} not found in passage`)
    }
    if (passage.indexOf(quote, first + 1) !== -1) {
      return fail('ambiguous-quote-anchor', `Quote ${JSON.stringify(quote)} occurs more than once in passage`)
    }
    return ok({ start: first, end: first + quote.length, text: quote })
  }

  const { start, end } = anchor
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > passage.length) {
    return fail(
      'invalid-numeric-anchor',
      `Offset anchor [${start}, ${end}) is not a non-empty range within the passage (length ${passage.length})`,
    )
  }
  return ok({ start, end, text: passage.slice(start, end) })
}

export function normalizeLevelRange(value: unknown): Result<LevelRange> {
  if (Array.isArray(value) && value.length === 2) {
    const [min, max] = value
    if (isProficiencyLevel(min) && isProficiencyLevel(max) && min <= max) return ok({ min, max })
  }
  return fail('invalid-level-range', `Level range ${JSON.stringify(value)} is not [min, max] within 1–6`)
}

export function normalizeConfidence(value: unknown): Result<number> {
  if (typeof value === 'number' && value >= 0 && value <= 1) return ok(value)
  return fail('invalid-confidence', `Confidence ${JSON.stringify(value)} is not a number from 0 to 1`)
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

/**
 * Students are kept even when level or language can't be normalized (the field
 * becomes null and a diagnostic is recorded) so a teacher never loses a student
 * from the picker because of bad metadata. Only a missing id/name drops one.
 */
function normalizeStudent(raw: RawStudent, index: number, report: (d: Diagnostic) => void): Student | null {
  const at = { record: 'student', index, id: isNonEmptyString(raw.id) ? raw.id : undefined } as const

  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) {
    report({ ...at, code: 'invalid-record', message: 'Student is missing an id or name' })
    return null
  }

  const level = normalizeProficiency(raw.level)
  if (!level.ok) report({ ...at, code: level.code, message: level.message })

  const language = normalizeLanguageName(raw.home_language)
  if (!language.ok) report({ ...at, code: language.code, message: language.message })

  return {
    id: raw.id,
    name: raw.name,
    level: level.ok ? level.value : null,
    homeLanguage: language.ok ? language.value : null,
  }
}

/** Validates the type-specific fields and returns them as a narrowed union member. */
export function normalizeScaffoldContent(raw: RawScaffold): Result<ScaffoldContent> {
  const { term, definition, text } = raw.content
  switch (raw.type) {
    case 'glossary':
      if (isNonEmptyString(term) && isNonEmptyString(definition)) return ok({ type: 'glossary', term, definition })
      return fail('invalid-record', 'Glossary scaffold needs a term and a definition')
    case 'translation': {
      if (!isNonEmptyString(text)) return fail('invalid-record', 'Translation scaffold needs text')
      const language = parseLanguageTag(raw.language)
      if (!language.ok) return language
      return ok({ type: 'translation', text, language: language.value })
    }
    case 'simplify':
      if (isNonEmptyString(text)) return ok({ type: 'simplify', text })
      return fail('invalid-record', 'Simplify scaffold needs text')
    default:
      return fail('invalid-record', `Unsupported scaffold type ${JSON.stringify(raw.type)}`)
  }
}

/**
 * A scaffold is all-or-nothing: every failing field is reported, and the
 * record is excluded. A partly-valid scaffold has no safe way to render.
 */
function normalizeScaffold(
  raw: RawScaffold,
  index: number,
  passage: string,
  report: (d: Diagnostic) => void,
): Scaffold | null {
  const at = { record: 'scaffold', index, id: isNonEmptyString(raw.id) ? raw.id : undefined } as const
  const take = <T>(result: Result<T>): T | null => {
    if (result.ok) return result.value
    report({ ...at, code: result.code, message: result.message })
    return null
  }

  const sourceId = take(isNonEmptyString(raw.id) ? ok(raw.id) : fail('invalid-record', 'Scaffold is missing an id'))
  const anchor = take(resolveAnchor(raw.anchor, passage))
  const levelRange = take(normalizeLevelRange(raw.level_range))
  const confidence = take(normalizeConfidence(raw.confidence))
  const content = take(normalizeScaffoldContent(raw))

  if (sourceId === null || anchor === null || levelRange === null || confidence === null || content === null) {
    return null
  }
  // sourceId is not unique ("s-08" appears twice) and is kept as-is; adding the array index
  // gives each record a deterministic, unique key without altering the source data.
  return { ...content, key: `${sourceId}@${index}`, sourceId, anchor, levelRange, confidence }
}

/** Reports every source id shared by more than one scaffold (valid or not). */
function findDuplicateSourceIds(scaffolds: RawScaffold[]): Diagnostic[] {
  const indexesById = new Map<string, number[]>()
  scaffolds.forEach((s, i) => indexesById.set(s.id, [...(indexesById.get(s.id) ?? []), i]))

  return [...indexesById]
    .filter(([, indexes]) => indexes.length > 1)
    .flatMap(([id, indexes]) =>
      indexes.map((index) => ({
        code: 'duplicate-source-id' as const,
        record: 'scaffold' as const,
        index,
        id,
        message: `Source id ${JSON.stringify(id)} is shared by scaffolds at indexes ${indexes.join(', ')}`,
      })),
    )
}

/**
 * raw JSON -> trusted ReaderData, plus diagnostics describing every source
 * problem found. Bad records are excluded individually; the rest still load.
 * Throws only if the passage itself is unusable, since nothing can anchor to it.
 */
export function normalizeData(raw: RawScaffoldReaderData): { data: ReaderData; diagnostics: Diagnostic[] } {
  const { passage } = raw
  if (typeof passage?.text !== 'string' || passage.text.length === 0) {
    throw new Error('Passage text is missing; no scaffolds can be anchored')
  }

  const diagnostics: Diagnostic[] = []
  const report = (d: Diagnostic) => diagnostics.push(d)

  const students = raw.students
    .map((s, i) => normalizeStudent(s, i, report))
    .filter((s): s is Student => s !== null)

  diagnostics.push(...findDuplicateSourceIds(raw.scaffolds))

  const scaffolds = raw.scaffolds
    .map((s, i) => normalizeScaffold(s, i, passage.text, report))
    .filter((s): s is Scaffold => s !== null)

  return {
    data: {
      passage: { id: passage.id, title: passage.title, grade: passage.grade, text: passage.text },
      students,
      scaffolds,
    },
    diagnostics,
  }
}

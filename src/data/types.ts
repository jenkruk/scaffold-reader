/*
 * The trusted domain model. Everything the UI and product rules consume comes
 * from normalizeData(), so these values have already been validated.
 */

/** WIDA English language proficiency levels. */
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Base ISO 639 language code, e.g. "es", "vi", "en". */
export type LanguageCode = string

export interface Passage {
  id: string
  title: string
  grade: number
  text: string
}

export interface Student {
  id: string
  name: string
  /** null when the source value was not a recognisable level (see diagnostics). */
  level: ProficiencyLevel | null
  /** null when the source language name was not recognised (see diagnostics). */
  homeLanguage: LanguageCode | null
}

/** A character range in Passage.text. Always 0 <= start < end <= text.length. */
export interface Anchor {
  start: number
  end: number
  /** passage.text.slice(start, end) */
  text: string
}

export interface LevelRange {
  min: ProficiencyLevel
  max: ProficiencyLevel
}

interface ScaffoldBase {
  /** Unique, implementation-only key. Use for React keys and lookups. */
  key: string
  /** The id from the source data. Not unique. */
  sourceId: string
  anchor: Anchor
  levelRange: LevelRange
  /** 0–1 inclusive. The student-facing threshold is applied in rules/eligibility.ts, not here. */
  confidence: number
}

export interface GlossaryContent {
  type: 'glossary'
  term: string
  definition: string
}

export interface TranslationContent {
  type: 'translation'
  text: string
  language: {
    /** The tag as given in the source, e.g. "es-MX". */
    tag: string
    /** Base language derived from the tag, e.g. "es". */
    base: LanguageCode
  }
}

export interface SimplifyContent {
  type: 'simplify'
  text: string
}

/** Type-specific fields. Switch on `type` to narrow. */
export type ScaffoldContent = GlossaryContent | TranslationContent | SimplifyContent

export type GlossaryScaffold = ScaffoldBase & GlossaryContent
export type TranslationScaffold = ScaffoldBase & TranslationContent
export type SimplifyScaffold = ScaffoldBase & SimplifyContent
export type Scaffold = GlossaryScaffold | TranslationScaffold | SimplifyScaffold

export interface ReaderData {
  passage: Passage
  students: Student[]
  scaffolds: Scaffold[]
}

export type DiagnosticCode =
  | 'duplicate-source-id'
  | 'invalid-proficiency'
  | 'unknown-language'
  | 'unresolved-quote-anchor'
  | 'ambiguous-quote-anchor'
  | 'invalid-numeric-anchor'
  | 'invalid-confidence'
  | 'invalid-level-range'
  | 'invalid-record'

/** A source-data problem found during normalization. Developer-facing only. */
export interface Diagnostic {
  code: DiagnosticCode
  message: string
  record: 'student' | 'scaffold'
  /** Position in the source array. */
  index: number
  /** The record's source id, when it has one. */
  id?: string
}

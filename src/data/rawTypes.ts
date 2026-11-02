/*
 * The JSON as it actually arrives. These types describe the source's known
 * inconsistencies rather than the shape we wish it had; nothing here is trusted.
 * normalize.ts relies on the object structure described here (records, anchor
 * and content objects exist) but validates every value at runtime, because a
 * type annotation on imported JSON is a claim, not a guarantee.
 */

export interface RawPassage {
  id: string
  title: string
  grade: number
  text: string
}

export interface RawStudent {
  id: string
  name: string
  /** Human-readable name, inconsistently spelled: "Spanish", "Español", ... */
  home_language: string
  /** Numeric (2) or a WIDA label ("Expanding"). */
  level: number | string
}

export interface RawOffsetAnchor {
  start: number
  end: number
}

export interface RawQuoteAnchor {
  quote: string
}

export type RawAnchor = RawOffsetAnchor | RawQuoteAnchor

/** Content fields vary by scaffold type and are not guaranteed to be present. */
export interface RawScaffoldContent {
  term?: string
  definition?: string
  text?: string
}

export interface RawScaffold {
  /** Not unique in the source ("s-08" appears twice). */
  id: string
  /** Expected: "glossary" | "translation" | "simplify", but not enforced by the source. */
  type: string
  anchor: RawAnchor
  /** Translation only. A BCP 47 tag, sometimes with a region ("es-MX"). */
  language?: string
  content: RawScaffoldContent
  /** Expected to be [min, max], but JSON arrays carry no length guarantee. */
  level_range: number[]
  confidence: number
}

export interface RawScaffoldReaderData {
  passage: RawPassage
  students: RawStudent[]
  scaffolds: RawScaffold[]
}

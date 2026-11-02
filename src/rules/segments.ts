import type { Scaffold } from '../data/types'

/**
 * One renderable run of passage text. Concatenating every segment's `text`
 * reproduces the passage exactly. `start`/`end` are passage offsets, also
 * usable as stable React keys.
 */
export type PassageSegment =
  | { type: 'text'; start: number; end: number; text: string }
  | {
      type: 'scaffold'
      start: number
      end: number
      text: string
      /**
       * Every eligible scaffold whose anchor overlaps this range, ordered by
       * position. Each keeps its own original anchor, which may be narrower
       * than the segment (e.g. "vapor" inside a "water vapor" segment).
       */
      scaffolds: Scaffold[]
    }

/**
 * Splits the passage into plain-text and interactive segments for the
 * scaffolds a student can see. Overlapping or nested anchors are merged into a
 * single interactive range (their union) so the UI never has to render nested
 * or competing controls. Ranges that merely touch (one ends where the next
 * starts) stay separate.
 *
 * Call this with already-eligible scaffolds: merging must reflect only what
 * this student will see.
 */
export function buildPassageSegments(passageText: string, scaffolds: readonly Scaffold[]): PassageSegment[] {
  const sorted = [...scaffolds].sort((a, b) => a.anchor.start - b.anchor.start || a.anchor.end - b.anchor.end)

  // Group scaffolds whose anchors overlap into merged ranges.
  const groups: { start: number; end: number; scaffolds: Scaffold[] }[] = []
  for (const scaffold of sorted) {
    const current = groups.at(-1)
    if (current && scaffold.anchor.start < current.end) {
      current.end = Math.max(current.end, scaffold.anchor.end)
      current.scaffolds.push(scaffold)
    } else {
      groups.push({ start: scaffold.anchor.start, end: scaffold.anchor.end, scaffolds: [scaffold] })
    }
  }

  const segments: PassageSegment[] = []
  let cursor = 0
  const pushText = (end: number) => {
    if (end > cursor) segments.push({ type: 'text', start: cursor, end, text: passageText.slice(cursor, end) })
  }
  for (const group of groups) {
    pushText(group.start)
    segments.push({ type: 'scaffold', ...group, text: passageText.slice(group.start, group.end) })
    cursor = group.end
  }
  pushText(passageText.length)

  return segments
}

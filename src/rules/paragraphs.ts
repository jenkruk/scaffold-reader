import type { PassageSegment } from './segments'

export interface Paragraph {
  /** Passage offset where the paragraph starts; a stable React key. */
  start: number
  segments: PassageSegment[]
}

// A blank line (optionally containing whitespace) separates paragraphs.
const PARAGRAPH_BREAK = /\n\s*\n/g

/**
 * Groups passage segments into paragraphs so the UI can render real <p>
 * elements without doing any offset math. Text segments are split at
 * paragraph breaks (the break itself is not rendered). A scaffold segment
 * that crosses a break would produce broken markup, so it throws instead.
 */
export function buildParagraphs(passageText: string, segments: readonly PassageSegment[]): Paragraph[] {
  const ranges: { start: number; end: number }[] = []
  let cursor = 0
  for (const match of passageText.matchAll(PARAGRAPH_BREAK)) {
    ranges.push({ start: cursor, end: match.index })
    cursor = match.index + match[0].length
  }
  ranges.push({ start: cursor, end: passageText.length })

  const paragraphs = ranges.map((range) => ({ ...range, segments: [] as PassageSegment[] }))

  for (const segment of segments) {
    if (segment.type === 'scaffold') {
      const home = paragraphs.find((p) => p.start <= segment.start && segment.end <= p.end)
      if (!home) {
        throw new Error(`Scaffold segment "${segment.text}" (${segment.start}–${segment.end}) crosses a paragraph break`)
      }
      home.segments.push(segment)
      continue
    }

    // Keep the part of a text segment that falls inside each paragraph.
    for (const p of paragraphs) {
      const start = Math.max(segment.start, p.start)
      const end = Math.min(segment.end, p.end)
      if (start >= end) continue
      const whole = start === segment.start && end === segment.end
      p.segments.push(whole ? segment : { type: 'text', start, end, text: passageText.slice(start, end) })
    }
  }

  return paragraphs.filter((p) => p.segments.length > 0).map(({ start, segments }) => ({ start, segments }))
}

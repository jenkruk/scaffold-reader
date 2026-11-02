import { readerData } from '../data/readerData'
import type { GlossaryScaffold, Scaffold } from '../data/types'
import { getEligibleScaffolds } from './eligibility'
import { buildPassageSegments, type PassageSegment } from './segments'

const TEXT = 'The quick brown fox jumps over the lazy dog.'

/** A glossary scaffold anchored at [start, end) of TEXT. */
function at(start: number, end: number, sourceId = `${start}-${end}`): GlossaryScaffold {
  const text = TEXT.slice(start, end)
  return {
    key: `${sourceId}@0`,
    sourceId,
    type: 'glossary',
    term: text,
    definition: '…',
    anchor: { start, end, text },
    levelRange: { min: 1, max: 6 },
    confidence: 1,
  }
}

/** Compact view: plain text as-is, interactive segments as [text]. */
const show = (segments: PassageSegment[]) =>
  segments.map((s) => (s.type === 'text' ? s.text : `[${s.text}]`)).join('')

/** Invariants that must hold for any input. */
function expectWellFormed(text: string, segments: PassageSegment[]) {
  expect(segments.map((s) => s.text).join('')).toBe(text)
  let cursor = 0
  for (const s of segments) {
    expect(s.start).toBe(cursor)
    expect(s.end).toBeGreaterThan(s.start)
    expect(s.text).toBe(text.slice(s.start, s.end))
    if (s.type === 'scaffold') expect(s.scaffolds.length).toBeGreaterThan(0)
    cursor = s.end
  }
  expect(cursor).toBe(text.length)
}

describe('buildPassageSegments', () => {
  test('with no scaffolds, the passage is one text segment', () => {
    expect(buildPassageSegments(TEXT, [])).toEqual([{ type: 'text', start: 0, end: TEXT.length, text: TEXT }])
  })

  test('keeps plain text in order around separate, non-overlapping scaffolds', () => {
    const segments = buildPassageSegments(TEXT, [at(16, 19), at(4, 9)])
    expect(show(segments)).toBe('The [quick] brown [fox] jumps over the lazy dog.')
    expectWellFormed(TEXT, segments)
  })

  test('scaffolds at the very start and end of the passage', () => {
    const segments = buildPassageSegments(TEXT, [at(0, 3), at(40, 44)])
    expect(show(segments)).toBe('[The] quick brown fox jumps over the lazy [dog.]')
    expectWellFormed(TEXT, segments)
  })

  test('merges a nested anchor into the enclosing range, keeping both scaffolds and their own anchors', () => {
    const outer = at(10, 19) // "brown fox"
    const inner = at(16, 19) // "fox"
    const [, segment] = buildPassageSegments(TEXT, [inner, outer])
    expect(segment).toMatchObject({ type: 'scaffold', start: 10, end: 19, text: 'brown fox' })
    if (segment?.type !== 'scaffold') throw new Error('expected scaffold segment')
    expect(segment.scaffolds).toEqual([outer, inner])
    expect(segment.scaffolds[1]?.anchor).toEqual({ start: 16, end: 19, text: 'fox' })
  })

  test('merges partially overlapping anchors by union, including chains', () => {
    // "quick brown" overlaps "brown fox", which overlaps "fox jumps"; "quick brown" and "fox jumps" do not touch.
    const segments = buildPassageSegments(TEXT, [at(4, 15), at(10, 19), at(16, 25)])
    expect(show(segments)).toBe('The [quick brown fox jumps] over the lazy dog.')
    expect(segments.filter((s) => s.type === 'scaffold')).toHaveLength(1)
    expectWellFormed(TEXT, segments)
  })

  test('a long anchor keeps covering later anchors after a shorter one nested inside it', () => {
    // "quick brown fox jumps" contains "brown" and then "jumps"; the merged range must not shrink to "brown".
    const segments = buildPassageSegments(TEXT, [at(4, 25), at(10, 15), at(20, 25)])
    expect(show(segments)).toBe('The [quick brown fox jumps] over the lazy dog.')
    expectWellFormed(TEXT, segments)
  })

  test('anchors that only touch stay separate', () => {
    const segments = buildPassageSegments(TEXT, [at(4, 9), at(9, 10)])
    expect(show(segments)).toBe('The [quick][ ]brown fox jumps over the lazy dog.')
  })

  test('does not modify the scaffolds it is given', () => {
    const scaffolds = [at(16, 19), at(10, 19)]
    const snapshot = structuredClone(scaffolds)
    buildPassageSegments(TEXT, scaffolds)
    expect(scaffolds).toEqual(snapshot)
  })
})

describe('segments for the provided dataset', () => {
  const { passage, students, scaffolds } = readerData
  const segmentsFor = (name: string) => {
    const student = students.find((s) => s.name === name)
    if (!student) throw new Error(`No student named ${name}`)
    return buildPassageSegments(passage.text, getEligibleScaffolds(student, scaffolds))
  }
  const segmentAt = (segments: PassageSegment[], offset: number) =>
    segments.find((s) => s.start <= offset && offset < s.end)

  test.each(students.map((s) => s.name))('%s: every passage character appears exactly once, in order', (name) => {
    expectWellFormed(passage.text, segmentsFor(name))
  })

  test('Amara: "water vapor" and the nested "vapor" become one interactive segment with both scaffolds', () => {
    const segment = segmentAt(segmentsFor('Amara'), 113)
    expect(segment).toMatchObject({ type: 'scaffold', start: 107, end: 118, text: 'water vapor' })
    if (segment?.type !== 'scaffold') throw new Error('expected scaffold segment')

    const byId = (id: string): Scaffold | undefined => segment.scaffolds.find((s) => s.sourceId === id)
    expect(segment.scaffolds.map((s) => s.sourceId)).toEqual(['s-04', 's-05'])
    expect(byId('s-04')?.anchor).toEqual({ start: 107, end: 118, text: 'water vapor' })
    expect(byId('s-05')?.anchor).toEqual({ start: 113, end: 118, text: 'vapor' })
  })

  test('Linh: without the Spanish "vapor" translation there is no overlap, just "water vapor"', () => {
    const segment = segmentAt(segmentsFor('Linh'), 113)
    expect(segment).toMatchObject({ type: 'scaffold', start: 107, end: 118, text: 'water vapor' })
    if (segment?.type !== 'scaffold') throw new Error('expected scaffold segment')
    expect(segment.scaffolds.map((s) => s.sourceId)).toEqual(['s-04'])
  })

  test('Jonah: the passage is a single plain-text segment', () => {
    expect(segmentsFor('Jonah')).toEqual([{ type: 'text', start: 0, end: passage.text.length, text: passage.text }])
  })
})

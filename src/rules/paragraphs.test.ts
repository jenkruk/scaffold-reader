import { readerData } from '../data/readerData'
import { getEligibleScaffolds } from './eligibility'
import { buildParagraphs, type Paragraph } from './paragraphs'
import { buildPassageSegments, type PassageSegment } from './segments'

const paragraphText = (p: Paragraph) => p.segments.map((s) => s.text).join('')

function scaffoldSegment(text: string, start: number, end: number): PassageSegment {
  return { type: 'scaffold', start, end, text: text.slice(start, end), scaffolds: [] }
}

describe('buildParagraphs', () => {
  const TEXT = 'One two.\n\nThree four.\n\nFive.'

  test('splits a plain text segment at paragraph breaks', () => {
    const paragraphs = buildParagraphs(TEXT, [{ type: 'text', start: 0, end: TEXT.length, text: TEXT }])
    expect(paragraphs.map(paragraphText)).toEqual(['One two.', 'Three four.', 'Five.'])
    expect(paragraphs.map((p) => p.start)).toEqual([0, 10, 23])
  })

  test('keeps scaffold segments intact and in their own paragraph', () => {
    const scaffold = scaffoldSegment(TEXT, 10, 15) // "Three"
    const segments: PassageSegment[] = [
      { type: 'text', start: 0, end: 10, text: TEXT.slice(0, 10) },
      scaffold,
      { type: 'text', start: 15, end: TEXT.length, text: TEXT.slice(15) },
    ]
    const paragraphs = buildParagraphs(TEXT, segments)
    expect(paragraphs.map(paragraphText)).toEqual(['One two.', 'Three four.', 'Five.'])
    expect(paragraphs[1]?.segments[0]).toBe(scaffold)
  })

  test('throws when a scaffold segment crosses a paragraph break', () => {
    expect(() => buildParagraphs(TEXT, [scaffoldSegment(TEXT, 4, 15)])).toThrow(/crosses a paragraph break/)
  })

  test('a passage with no breaks is one paragraph', () => {
    expect(buildParagraphs('Just one.', [{ type: 'text', start: 0, end: 9, text: 'Just one.' }])).toHaveLength(1)
  })
})

describe('paragraphs for the provided passage', () => {
  const { passage, students, scaffolds } = readerData

  test.each(students.map((s) => [s.name, s] as const))('%s: 3 paragraphs that rebuild the passage', (_, student) => {
    const segments = buildPassageSegments(passage.text, getEligibleScaffolds(student, scaffolds))
    const paragraphs = buildParagraphs(passage.text, segments)

    expect(paragraphs).toHaveLength(3)
    expect(paragraphs.map(paragraphText).join('\n\n')).toBe(passage.text)

    // Every scaffold segment survives untouched, exactly once.
    const rendered = paragraphs.flatMap((p) => p.segments).filter((s) => s.type === 'scaffold')
    expect(rendered).toEqual(segments.filter((s) => s.type === 'scaffold'))
    rendered.forEach((s, i) => expect(s).toBe(segments.filter((x) => x.type === 'scaffold')[i]))
  })
})

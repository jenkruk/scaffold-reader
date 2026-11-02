import { readerData, readerDiagnostics } from './readerData'

// Pins down what the real source data normalizes to, so any change in
// normalization behaviour shows up as an explicit diff here.
describe('the provided dataset', () => {
  test('normalizes every student', () => {
    expect(readerData.students).toEqual([
      { id: 'st-1', name: 'Amara', level: 2, homeLanguage: 'es' },
      { id: 'st-2', name: 'Diego', level: 4, homeLanguage: 'es' },
      { id: 'st-3', name: 'Linh', level: 3, homeLanguage: 'vi' },
      { id: 'st-4', name: 'Jonah', level: 6, homeLanguage: 'en' },
    ])
  })

  test('keeps all twelve scaffolds, including both s-08s and the low-confidence s-11', () => {
    expect(readerData.scaffolds).toHaveLength(12)
    expect(readerData.scaffolds.filter((s) => s.sourceId === 's-08').map((s) => s.type)).toEqual([
      'simplify',
      'glossary',
    ])
    expect(readerData.scaffolds.find((s) => s.sourceId === 's-11')?.confidence).toBe(0.31)
  })

  test('every anchor resolves to the text it points at', () => {
    const { text } = readerData.passage
    for (const s of readerData.scaffolds) {
      expect(text.slice(s.anchor.start, s.anchor.end)).toBe(s.anchor.text)
    }
  })

  test('reports only the duplicate s-08 id', () => {
    expect(readerDiagnostics.map((d) => [d.code, d.id, d.index])).toEqual([
      ['duplicate-source-id', 's-08', 7],
      ['duplicate-source-id', 's-08', 8],
    ])
  })
})

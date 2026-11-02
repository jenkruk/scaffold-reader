import {
  normalizeConfidence,
  normalizeData,
  normalizeLanguageName,
  normalizeLevelRange,
  normalizeProficiency,
  parseLanguageTag,
  resolveAnchor,
} from './normalize'
import type { RawScaffold, RawScaffoldReaderData, RawStudent } from './rawTypes'

const PASSAGE = 'The cat sat. The cat ran away.'

function scaffold(overrides: Partial<RawScaffold> = {}): RawScaffold {
  return {
    id: 's-1',
    type: 'glossary',
    anchor: { quote: 'sat' },
    content: { term: 'sat', definition: 'Past tense of sit.' },
    level_range: [1, 4],
    confidence: 0.9,
    ...overrides,
  }
}

function student(overrides: Partial<RawStudent> = {}): RawStudent {
  return { id: 'st-1', name: 'Ana', home_language: 'Spanish', level: 2, ...overrides }
}

function dataset(parts: Partial<RawScaffoldReaderData> = {}): RawScaffoldReaderData {
  return {
    passage: { id: 'p', title: 'T', grade: 6, text: PASSAGE },
    students: [],
    scaffolds: [],
    ...parts,
  }
}

describe('normalizeProficiency', () => {
  test('maps WIDA labels to numbers', () => {
    expect(normalizeProficiency('Expanding')).toEqual({ ok: true, value: 4 })
  })

  test('matches labels case-insensitively and ignores surrounding whitespace', () => {
    expect(normalizeProficiency('  eNtErInG ')).toEqual({ ok: true, value: 1 })
    expect(normalizeProficiency('REACHING')).toEqual({ ok: true, value: 6 })
  })

  test('keeps valid numeric levels', () => {
    expect(normalizeProficiency(2)).toEqual({ ok: true, value: 2 })
    expect(normalizeProficiency(6)).toEqual({ ok: true, value: 6 })
  })

  test.each([0, 7, 2.5, NaN, 'Advanced', '3', ''])('rejects %j', (value) => {
    expect(normalizeProficiency(value)).toMatchObject({ ok: false, code: 'invalid-proficiency' })
  })
})

describe('normalizeLanguageName', () => {
  test('maps English and native names to base codes', () => {
    expect(normalizeLanguageName('Spanish')).toEqual({ ok: true, value: 'es' })
    expect(normalizeLanguageName('Español')).toEqual({ ok: true, value: 'es' })
    expect(normalizeLanguageName(' vietnamese ')).toEqual({ ok: true, value: 'vi' })
    expect(normalizeLanguageName('ENGLISH')).toEqual({ ok: true, value: 'en' })
  })

  test('matches a decomposed "ñ"', () => {
    expect(normalizeLanguageName('Español')).toEqual({ ok: true, value: 'es' })
  })

  test('does not guess unknown languages', () => {
    expect(normalizeLanguageName('Klingon')).toMatchObject({ ok: false, code: 'unknown-language' })
  })
})

describe('parseLanguageTag', () => {
  test('preserves a regional tag and exposes its base language', () => {
    expect(parseLanguageTag('es-MX')).toEqual({ ok: true, value: { tag: 'es-MX', base: 'es' } })
    expect(parseLanguageTag('vi')).toEqual({ ok: true, value: { tag: 'vi', base: 'vi' } })
  })

  test('rejects malformed or missing tags', () => {
    expect(parseLanguageTag('not a tag')).toMatchObject({ ok: false, code: 'unknown-language' })
    expect(parseLanguageTag(undefined)).toMatchObject({ ok: false, code: 'unknown-language' })
  })
})

describe('resolveAnchor', () => {
  test('resolves a quote that occurs exactly once to offsets', () => {
    expect(resolveAnchor({ quote: 'ran away' }, PASSAGE)).toEqual({
      ok: true,
      value: { start: 21, end: 29, text: 'ran away' },
    })
  })

  test('rejects a quote that does not occur', () => {
    expect(resolveAnchor({ quote: 'dog' }, PASSAGE)).toMatchObject({ ok: false, code: 'unresolved-quote-anchor' })
  })

  test('quote matching is exact, not case-insensitive', () => {
    expect(resolveAnchor({ quote: 'CAT SAT' }, PASSAGE)).toMatchObject({ ok: false, code: 'unresolved-quote-anchor' })
  })

  test('rejects an empty quote', () => {
    expect(resolveAnchor({ quote: '' }, PASSAGE)).toMatchObject({ ok: false, code: 'unresolved-quote-anchor' })
  })

  test('rejects a quote that occurs more than once instead of picking one', () => {
    expect(resolveAnchor({ quote: 'The cat' }, PASSAGE)).toMatchObject({ ok: false, code: 'ambiguous-quote-anchor' })
  })

  test('resolves valid offsets against the unmodified passage', () => {
    expect(resolveAnchor({ start: 4, end: 7 }, PASSAGE)).toEqual({ ok: true, value: { start: 4, end: 7, text: 'cat' } })
    expect(resolveAnchor({ start: 0, end: PASSAGE.length }, PASSAGE)).toMatchObject({ ok: true })
  })

  test.each([
    { start: 5, end: 5 },
    { start: 7, end: 4 },
    { start: -1, end: 3 },
    { start: 0, end: PASSAGE.length + 1 },
    { start: 1.5, end: 3 },
  ])('rejects invalid offsets %j', (anchor) => {
    expect(resolveAnchor(anchor, PASSAGE)).toMatchObject({ ok: false, code: 'invalid-numeric-anchor' })
  })
})

describe('normalizeLevelRange', () => {
  test('accepts [min, max] within 1–6', () => {
    expect(normalizeLevelRange([1, 4])).toEqual({ ok: true, value: { min: 1, max: 4 } })
    expect(normalizeLevelRange([3, 3])).toEqual({ ok: true, value: { min: 3, max: 3 } })
  })

  test.each([[[4, 1]], [[0, 3]], [[1, 7]], [[1]], [[1, 2, 3]], [[1.5, 3]]])('rejects %j', (range) => {
    expect(normalizeLevelRange(range)).toMatchObject({ ok: false, code: 'invalid-level-range' })
  })
})

describe('normalizeConfidence', () => {
  test('keeps low but valid confidence; thresholds are product policy, not validation', () => {
    expect(normalizeConfidence(0.31)).toEqual({ ok: true, value: 0.31 })
    expect(normalizeConfidence(0)).toEqual({ ok: true, value: 0 })
    expect(normalizeConfidence(1)).toEqual({ ok: true, value: 1 })
  })

  test.each([-0.1, 1.01, NaN, '0.9'])('rejects %j', (value) => {
    expect(normalizeConfidence(value)).toMatchObject({ ok: false, code: 'invalid-confidence' })
  })
})

describe('normalizeData', () => {
  test('produces a trusted scaffold regardless of anchor source', () => {
    const { data, diagnostics } = normalizeData(
      dataset({
        scaffolds: [
          scaffold({ id: 'a', anchor: { start: 4, end: 7 } }),
          scaffold({ id: 'b', anchor: { quote: 'sat' } }),
        ],
      }),
    )
    expect(diagnostics).toEqual([])
    expect(data.scaffolds.map((s) => s.anchor)).toEqual([
      { start: 4, end: 7, text: 'cat' },
      { start: 8, end: 11, text: 'sat' },
    ])
  })

  test('keeps both scaffolds that share a source id, with unique keys, and reports the duplicate', () => {
    const { data, diagnostics } = normalizeData(
      dataset({
        scaffolds: [
          scaffold({ id: 's-08' }),
          scaffold({ id: 's-08', type: 'simplify', content: { text: 'ran' } }),
        ],
      }),
    )
    expect(data.scaffolds.map((s) => s.sourceId)).toEqual(['s-08', 's-08'])
    expect(new Set(data.scaffolds.map((s) => s.key)).size).toBe(2)
    expect(diagnostics.map((d) => [d.code, d.index])).toEqual([
      ['duplicate-source-id', 0],
      ['duplicate-source-id', 1],
    ])
  })

  test('excludes only the invalid scaffold and reports each of its problems', () => {
    const { data, diagnostics } = normalizeData(
      dataset({
        scaffolds: [
          scaffold({ id: 'good' }),
          scaffold({ id: 'bad', anchor: { quote: 'dog' }, confidence: 2, level_range: [5, 2] }),
        ],
      }),
    )
    expect(data.scaffolds.map((s) => s.sourceId)).toEqual(['good'])
    expect(diagnostics.map((d) => d.code)).toEqual([
      'unresolved-quote-anchor',
      'invalid-level-range',
      'invalid-confidence',
    ])
    expect(diagnostics.every((d) => d.id === 'bad' && d.index === 1)).toBe(true)
  })

  test('rejects scaffolds with missing content or an unsupported type', () => {
    const { data, diagnostics } = normalizeData(
      dataset({
        scaffolds: [
          scaffold({ content: { term: 'sat' } }),
          scaffold({ type: 'translation', content: { text: 'se sentó' } }),
          scaffold({ type: 'audio' }),
        ],
      }),
    )
    expect(data.scaffolds).toEqual([])
    expect(diagnostics.filter((d) => d.code !== 'duplicate-source-id').map((d) => d.code)).toEqual([
      'invalid-record',
      'unknown-language',
      'invalid-record',
    ])
  })

  test('narrows translation content and preserves the language tag', () => {
    const { data } = normalizeData(
      dataset({
        scaffolds: [scaffold({ type: 'translation', language: 'es-MX', content: { text: 'se sentó' } })],
      }),
    )
    const [s] = data.scaffolds
    expect(s?.type).toBe('translation')
    if (s?.type === 'translation') expect(s.language).toEqual({ tag: 'es-MX', base: 'es' })
  })

  test('keeps a student with an unusable level or language, nulling the field and reporting it', () => {
    const { data, diagnostics } = normalizeData(
      dataset({
        students: [
          student({ id: 'ok', level: 'Expanding', home_language: 'Español' }),
          student({ id: 'odd', level: 'Advanced', home_language: 'Klingon' }),
        ],
      }),
    )
    expect(data.students).toEqual([
      { id: 'ok', name: 'Ana', level: 4, homeLanguage: 'es' },
      { id: 'odd', name: 'Ana', level: null, homeLanguage: null },
    ])
    expect(diagnostics.map((d) => [d.code, d.id])).toEqual([
      ['invalid-proficiency', 'odd'],
      ['unknown-language', 'odd'],
    ])
  })

  test('drops a student with no id', () => {
    const { data, diagnostics } = normalizeData(dataset({ students: [student({ id: '' }), student()] }))
    expect(data.students.map((s) => s.id)).toEqual(['st-1'])
    expect(diagnostics).toMatchObject([{ code: 'invalid-record', record: 'student', index: 0 }])
  })

  test('throws when there is no passage text to anchor to', () => {
    expect(() => normalizeData(dataset({ passage: { id: 'p', title: 'T', grade: 6, text: '' } }))).toThrow()
  })
})

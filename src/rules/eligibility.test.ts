import { readerData } from '../data/readerData'
import type { GlossaryScaffold, Scaffold, SimplifyScaffold, Student, TranslationScaffold } from '../data/types'
import { MIN_SCAFFOLD_CONFIDENCE, getEligibleScaffolds } from './eligibility'

const base = {
  anchor: { start: 0, end: 4, text: 'word' },
  levelRange: { min: 2, max: 4 },
  confidence: 0.9,
} as const

const glossary = (overrides: Partial<GlossaryScaffold> = {}): GlossaryScaffold => ({
  ...base,
  key: 'g@0',
  sourceId: 'g',
  type: 'glossary',
  term: 'word',
  definition: 'A unit of language.',
  ...overrides,
})

const simplify = (overrides: Partial<SimplifyScaffold> = {}): SimplifyScaffold => ({
  ...base,
  key: 's@1',
  sourceId: 's',
  type: 'simplify',
  text: 'easier words',
  ...overrides,
})

const translation = (tag: string, overrides: Partial<TranslationScaffold> = {}): TranslationScaffold => ({
  ...base,
  key: `t-${tag}@2`,
  sourceId: `t-${tag}`,
  type: 'translation',
  text: 'palabra',
  language: { tag, base: new Intl.Locale(tag).language },
  ...overrides,
})

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'st',
  name: 'Test',
  level: 3,
  homeLanguage: 'es',
  ...overrides,
})

const ids = (scaffolds: Scaffold[]) => scaffolds.map((s) => s.sourceId)

describe('getEligibleScaffolds', () => {
  test('level range is inclusive at both ends', () => {
    const scaffolds = [glossary()]
    expect(getEligibleScaffolds(student({ level: 1 }), scaffolds)).toEqual([])
    expect(getEligibleScaffolds(student({ level: 2 }), scaffolds)).toHaveLength(1)
    expect(getEligibleScaffolds(student({ level: 4 }), scaffolds)).toHaveLength(1)
    expect(getEligibleScaffolds(student({ level: 5 }), scaffolds)).toEqual([])
  })

  test('a student with an unknown level gets no scaffolds', () => {
    expect(getEligibleScaffolds(student({ level: null }), [glossary(), simplify(), translation('es')])).toEqual([])
  })

  test(`confidence below ${MIN_SCAFFOLD_CONFIDENCE} is excluded; exactly ${MIN_SCAFFOLD_CONFIDENCE} is included`, () => {
    expect(getEligibleScaffolds(student(), [glossary({ confidence: 0.49 })])).toEqual([])
    expect(getEligibleScaffolds(student(), [glossary({ confidence: 0.5 })])).toHaveLength(1)
  })

  test('glossary and simplify ignore language, including an unknown one', () => {
    for (const homeLanguage of ['vi', 'en', null]) {
      expect(ids(getEligibleScaffolds(student({ homeLanguage }), [glossary(), simplify()]))).toEqual(['g', 's'])
    }
  })

  test('translations require a matching base language', () => {
    const scaffolds = [translation('es'), translation('vi')]
    expect(ids(getEligibleScaffolds(student({ homeLanguage: 'es' }), scaffolds))).toEqual(['t-es'])
    expect(ids(getEligibleScaffolds(student({ homeLanguage: 'vi' }), scaffolds))).toEqual(['t-vi'])
    expect(getEligibleScaffolds(student({ homeLanguage: null }), scaffolds)).toEqual([])
  })

  test('an "es" student matches a regional "es-MX" translation', () => {
    expect(ids(getEligibleScaffolds(student({ homeLanguage: 'es' }), [translation('es-MX')]))).toEqual(['t-es-MX'])
  })

  test('a language mismatch excludes only translations', () => {
    const scaffolds = [glossary(), translation('vi'), simplify()]
    expect(ids(getEligibleScaffolds(student({ homeLanguage: 'es' }), scaffolds))).toEqual(['g', 's'])
  })

  test('keeps a translation whose text matches the source word', () => {
    const same = translation('es', { anchor: { start: 0, end: 5, text: 'vapor' }, text: 'vapor' })
    expect(getEligibleScaffolds(student(), [same])).toEqual([same])
  })

  test('returns the original scaffold objects without modifying the input', () => {
    const scaffolds = [glossary(), glossary({ confidence: 0.1 })]
    const result = getEligibleScaffolds(student(), scaffolds)
    expect(result[0]).toBe(scaffolds[0])
    expect(scaffolds).toHaveLength(2)
  })
})

describe('the provided dataset', () => {
  const eligibleFor = (name: string) => {
    const s = readerData.students.find((st) => st.name === name)
    if (!s) throw new Error(`No student named ${name}`)
    return getEligibleScaffolds(s, readerData.scaffolds).map((sc) => `${sc.sourceId}:${sc.type}`)
  }

  test('Amara (level 2, es) gets Spanish translations, including es-MX', () => {
    expect(eligibleFor('Amara')).toEqual([
      's-01:glossary',
      's-02:glossary',
      's-03:glossary',
      's-04:glossary',
      's-05:translation',
      's-06:translation',
      's-08:simplify',
      's-08:glossary',
      's-12:glossary',
    ])
  })

  test('Diego (Expanding = 4, es) gets no level 1–2 Spanish translations, but keeps glossary support', () => {
    expect(eligibleFor('Diego')).toEqual(['s-01:glossary', 's-02:glossary', 's-03:glossary', 's-08:glossary', 's-12:glossary'])
  })

  test('Linh (level 3, vi) gets the Vietnamese translations', () => {
    expect(eligibleFor('Linh')).toEqual([
      's-01:glossary',
      's-02:glossary',
      's-03:glossary',
      's-04:glossary',
      's-07:translation',
      's-08:glossary',
      's-10:translation',
      's-12:glossary',
    ])
  })

  test('Jonah (level 6) gets no scaffolds, because none is for level 6', () => {
    expect(eligibleFor('Jonah')).toEqual([])
  })

  test('the low-confidence s-11 stays in the data but is shown to nobody', () => {
    expect(readerData.scaffolds.some((s) => s.sourceId === 's-11')).toBe(true)
    for (const s of readerData.students) {
      expect(getEligibleScaffolds(s, readerData.scaffolds).some((sc) => sc.sourceId === 's-11')).toBe(false)
    }
  })
})

import type { Scaffold, Student } from '../data/types'

/**
 * Scaffolds below this confidence are hidden from students.
 * 0.5 is a product assumption for this exercise, not an educational standard.
 */
export const MIN_SCAFFOLD_CONFIDENCE = 0.5

function isEligible(student: Student, scaffold: Scaffold): boolean {
  // An unknown level gets nothing rather than a guessed level.
  if (student.level === null) return false
  if (student.level < scaffold.levelRange.min || student.level > scaffold.levelRange.max) return false

  if (scaffold.confidence < MIN_SCAFFOLD_CONFIDENCE) return false

  // Students have only a base language, so "es" should match "es-MX".
  // Identical text ("vapor" -> "vapor") is kept on purpose: the same word can exist in both
  // languages, and an explicit translation still confirms the meaning.
  if (scaffold.type === 'translation') {
    return student.homeLanguage !== null && student.homeLanguage === scaffold.language.base
  }

  // Glossary and simplify scaffolds ignore language.
  return true
}

/** The scaffolds this student should see, in source order. Inputs are not modified. */
export function getEligibleScaffolds(student: Student, scaffolds: readonly Scaffold[]): Scaffold[] {
  return scaffolds.filter((scaffold) => isEligible(student, scaffold))
}

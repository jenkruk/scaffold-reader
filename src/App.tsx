import { useState } from 'react'
import { StudentSelector } from './components/StudentSelector'
import { ReadingView } from './components/ReadingView'
import { readerData } from './data/readerData'
import { getEligibleScaffolds } from './rules/eligibility'
import { buildParagraphs } from './rules/paragraphs'
import { buildPassageSegments } from './rules/segments'

const { passage, students, scaffolds } = readerData

export function App() {
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const student = students.find((s) => s.id === studentId)

  // All product rules live in src/rules; React only wires them together.
  const eligible = student ? getEligibleScaffolds(student, scaffolds) : []
  const paragraphs = buildParagraphs(passage.text, buildPassageSegments(passage.text, eligible))

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-2xl px-4 pt-3 sm:px-6 sm:pt-4">
          <StudentSelector students={students} selectedId={studentId} onChange={setStudentId} />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
        {/* key: a new student starts with no support open. */}
        <ReadingView key={studentId} passage={passage} paragraphs={paragraphs} />
      </main>
    </div>
  )
}

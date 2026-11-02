import type { Student } from '../data/types'

interface Props {
  students: Student[]
  selectedId: string
  onChange: (id: string) => void
}

/**
 * Native radio group drawn as file tabs. It stays a radio group, not ARIA tabs,
 * because it selects a student rather than switching panels; the browser gives
 * one Tab stop and arrow-key selection.
 *
 * Selection never relies on colour alone: the selected tab joins the reading
 * area below (same background, covering the header border) and has a top bar
 * and heavier text.
 *
 * Narrow screens: tabs share one row evenly. Below ~266px they wrap and names
 * align left; the container query fires slightly early to allow for wider fonts.
 */
export function StudentSelector({ students, selectedId, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 w-full text-xs font-semibold tracking-wide text-ink-muted uppercase">Reading as</legend>
      <div className="@container -mb-px flex flex-wrap gap-1">
        {students.map((student) => (
          <label key={student.id} className="flex-1 cursor-pointer sm:flex-none">
            <input
              type="radio"
              name="student"
              value={student.id}
              checked={student.id === selectedId}
              onChange={() => onChange(student.id)}
              className="peer sr-only"
            />
            <span
              className="flex min-h-11 items-center justify-center rounded-t-sm border-x border-t-3 border-b-0 border-transparent bg-surface-muted px-2.5 text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink peer-checked:border-x-border peer-checked:border-t-accent peer-checked:bg-page peer-checked:font-semibold peer-checked:text-ink peer-checked:hover:bg-page peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus sm:min-w-24 sm:px-4 @max-[17rem]:justify-start @max-[17rem]:px-4"
            >
              {student.name}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

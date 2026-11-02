import type { Ref } from 'react'

interface Props {
  text: string
  isOpen: boolean
  popoverId: string
  onToggle: () => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * The passage phrase itself, as a native button so Tab, Enter and Space work
 * without extra code. The dotted underline (not just colour) marks it as
 * interactive. Hover only firms up the underline; a soft tint means "open".
 * Keyboard focus keeps the global :focus-visible ring on top of either.
 */
export function ScaffoldTrigger({ text, isOpen, popoverId, onToggle, ref }: Props) {
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={isOpen}
      aria-controls={isOpen ? popoverId : undefined}
      onClick={onToggle}
      className="cursor-pointer rounded-sm underline decoration-accent decoration-dotted decoration-[1.5px] underline-offset-[0.3em] transition-colors hover:decoration-solid aria-expanded:bg-accent-soft aria-expanded:decoration-solid"
    >
      {text}
    </button>
  )
}

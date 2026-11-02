import { useLayoutEffect, type RefObject } from 'react'
import type { Scaffold } from '../data/types'
import { placePopover } from './popoverPosition'

interface Props {
  id: string
  /** The trigger's passage text. */
  phrase: string
  scaffolds: Scaffold[]
  triggerRef: RefObject<HTMLButtonElement | null>
  containerRef: RefObject<HTMLElement | null>
  popoverRef: RefObject<HTMLSpanElement | null>
  onClose: () => void
}

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

function labelFor(scaffold: Scaffold): string {
  switch (scaffold.type) {
    case 'glossary':
      return 'Definition'
    case 'simplify':
      return 'Simpler wording'
    case 'translation':
      return languageNames.of(scaffold.language.base) ?? scaffold.language.tag
  }
}

/**
 * Non-modal support card. It is rendered inside the paragraph, right after
 * its trigger, so screen readers and Tab reach it next; it is only *drawn* as
 * a floating card near the phrase, at every screen size. Built from spans
 * because a <p> may only contain phrasing content.
 *
 * Placement (see placePopover): below the trigger, or above it when there is
 * not enough room below, kept inside the reading column. It never moves the
 * passage text.
 */
export function ScaffoldPopover({ id, phrase, scaffolds, triggerRef, containerRef, popoverRef, onClose }: Props) {
  // Position is written straight to the element (no state) so it is in place before paint.
  useLayoutEffect(() => {
    const place = () => {
      const trigger = triggerRef.current
      const container = containerRef.current
      const popover = popoverRef.current
      if (!trigger || !container || !popover) return
      popover.style.maxHeight = '' // measure the natural height
      const { top, left, maxHeight } = placePopover({
        trigger: trigger.getBoundingClientRect(),
        container: container.getBoundingClientRect(),
        popover: { width: popover.offsetWidth, height: popover.offsetHeight },
        viewportHeight: window.innerHeight,
      })
      popover.style.top = `${top}px`
      popover.style.left = `${left}px`
      popover.style.maxHeight = maxHeight === null ? '' : `${maxHeight}px`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [triggerRef, containerRef, popoverRef])

  // Several supports can share one trigger (e.g. "water vapor" + nested "vapor").
  // Then each names its own anchor phrase, so none appears to cover more than it does.
  const showPhrases = scaffolds.length > 1

  return (
    <span
      ref={popoverRef}
      id={id}
      role="group"
      aria-label={`Help with “${phrase}”`}
      className="absolute z-10 flex w-[min(22rem,100%)] animate-popover-in flex-col overflow-y-auto rounded-md border border-border bg-surface px-4 py-3 text-base leading-normal shadow-popover sm:block"
    >
      {/* Below `sm` (phones, or high browser zoom) the close button gets its own line above the
          content so text never runs under it; it stays last in the DOM, so reading and Tab order
          are unchanged. Long words break rather than overflow at extreme zoom. */}
      <span role="list" className="block divide-y divide-border wrap-anywhere">
        {scaffolds.map((scaffold) => (
          <span role="listitem" key={scaffold.key} className="block py-2 first:pt-0 last:pb-0 sm:first:pr-7">
            <span className="block text-xs font-semibold tracking-wide text-ink-muted uppercase">
              {labelFor(scaffold)}
            </span>
            <span className="mt-0.5 block">
              {showPhrases && <span className="font-semibold">{scaffold.anchor.text}: </span>}
              {scaffold.type === 'glossary' && scaffold.definition}
              {scaffold.type === 'simplify' && scaffold.text}
              {scaffold.type === 'translation' && <span lang={scaffold.language.tag}>{scaffold.text}</span>}
            </span>
          </span>
        ))}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="order-first -mt-2 -mr-3 mb-0.5 grid size-9 shrink-0 cursor-pointer place-items-center self-end rounded-full sm:absolute sm:top-1 sm:right-1 sm:m-0 text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </span>
  )
}

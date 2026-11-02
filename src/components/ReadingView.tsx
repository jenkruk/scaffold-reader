import { Fragment, useEffect, useId, useRef, useState } from 'react'
import type { Passage } from '../data/types'
import type { Paragraph } from '../rules/paragraphs'
import { ScaffoldPopover } from './ScaffoldPopover'
import { ScaffoldTrigger } from './ScaffoldTrigger'

interface Props {
  passage: Passage
  paragraphs: Paragraph[]
}

/**
 * Renders render-ready paragraphs and owns which support is open (at most one,
 * identified by its segment's start offset). The parent remounts this per
 * student, which resets that state.
 */
export function ReadingView({ passage, paragraphs }: Props) {
  const [openStart, setOpenStart] = useState<number | null>(null)
  const articleRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLSpanElement>(null)
  const idPrefix = useId()

  // Close, returning focus to the trigger (used for Escape and the Close button,
  // which would otherwise leave focus on a removed element).
  const closeAndRefocus = () => {
    const trigger = triggerRef.current
    setOpenStart(null)
    trigger?.focus()
  }

  useEffect(() => {
    if (openStart === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAndRefocus()
    }
    // A press anywhere outside the card and its trigger closes it, leaving focus alone.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpenStart(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openStart])

  return (
    <article ref={articleRef} className="relative">
      <header>
        <p className="text-sm text-ink-muted">Grade {passage.grade}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{passage.title}</h1>
      </header>

      <div className="mt-8 space-y-6 text-lg leading-relaxed sm:text-xl sm:leading-relaxed">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.start}>
            {paragraph.segments.map((segment) => {
              if (segment.type === 'text') return <Fragment key={segment.start}>{segment.text}</Fragment>

              const isOpen = segment.start === openStart
              const popoverId = `${idPrefix}-support-${segment.start}`
              return (
                <Fragment key={segment.start}>
                  <ScaffoldTrigger
                    ref={isOpen ? triggerRef : undefined}
                    text={segment.text}
                    isOpen={isOpen}
                    popoverId={popoverId}
                    onToggle={() => setOpenStart(isOpen ? null : segment.start)}
                  />
                  {isOpen && (
                    <ScaffoldPopover
                      id={popoverId}
                      phrase={segment.text}
                      scaffolds={segment.scaffolds}
                      triggerRef={triggerRef}
                      containerRef={articleRef}
                      popoverRef={popoverRef}
                      onClose={closeAndRefocus}
                    />
                  )}
                </Fragment>
              )
            })}
          </p>
        ))}
      </div>
    </article>
  )
}

export interface PopoverPlacement {
  /** Offsets relative to the positioned container (the article). */
  top: number
  left: number
  side: 'below' | 'above'
  /** Set only when the card is taller than the space available; it then scrolls internally. */
  maxHeight: number | null
}

interface Input {
  /** Viewport-relative rects, as from getBoundingClientRect(). */
  trigger: Pick<DOMRect, 'top' | 'bottom' | 'left'>
  container: Pick<DOMRect, 'top' | 'left' | 'width'>
  /** The card's natural size. */
  popover: { width: number; height: number }
  viewportHeight: number
  /** Space between trigger and card. */
  gap?: number
  /** Minimum space kept between the card and the viewport edge. */
  margin?: number
}

/**
 * Prefer below the trigger; flip above only when the card doesn't fit below
 * and there is more room above. If it fits neither side, use the roomier side
 * and cap its height. Horizontally, start at the trigger's left edge and shift
 * left as needed to stay inside the container.
 */
export function placePopover({ trigger, container, popover, viewportHeight, gap = 6, margin = 12 }: Input): PopoverPlacement {
  const spaceBelow = viewportHeight - trigger.bottom - gap - margin
  const spaceAbove = trigger.top - gap - margin
  const side = popover.height <= spaceBelow || spaceBelow >= spaceAbove ? 'below' : 'above'

  const space = side === 'below' ? spaceBelow : spaceAbove
  const maxHeight = popover.height > space ? Math.max(0, space) : null
  const height = maxHeight ?? popover.height

  const top = side === 'below' ? trigger.bottom - container.top + gap : trigger.top - container.top - gap - height
  const maxLeft = Math.max(0, container.width - popover.width)
  const left = Math.min(Math.max(0, trigger.left - container.left), maxLeft)

  return { top, left, side, maxHeight }
}

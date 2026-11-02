import { placePopover } from './popoverPosition'

// A 343px-wide column starting 16px from the left, in an 800px-tall viewport.
const container = { top: 100, left: 16, width: 343 }
const popover = { width: 343, height: 150 }
const trigger = (top: number, left = 40) => ({ top, bottom: top + 24, left })

describe('placePopover', () => {
  test('places the card below the trigger when it fits', () => {
    expect(placePopover({ trigger: trigger(300), container, popover, viewportHeight: 800 })).toEqual({
      side: 'below',
      top: 300 + 24 - 100 + 6,
      left: 0,
      maxHeight: null,
    })
  })

  test('flips above when there is not enough room below', () => {
    const placement = placePopover({ trigger: trigger(700), container, popover, viewportHeight: 800 })
    expect(placement.side).toBe('above')
    // Card bottom sits `gap` above the trigger top.
    expect(placement.top + popover.height).toBe(700 - 100 - 6)
    expect(placement.maxHeight).toBeNull()
  })

  test('stays below when it does not fit either side but below is roomier, capping its height', () => {
    const tall = { width: 343, height: 600 }
    const placement = placePopover({ trigger: trigger(200), container, popover: tall, viewportHeight: 800 })
    expect(placement.side).toBe('below')
    expect(placement.maxHeight).toBe(800 - 224 - 6 - 12)
  })

  test('flips above and caps height when above is roomier', () => {
    const tall = { width: 343, height: 700 }
    const placement = placePopover({ trigger: trigger(500), container, popover: tall, viewportHeight: 800 })
    expect(placement.side).toBe('above')
    expect(placement.maxHeight).toBe(500 - 6 - 12)
    expect(placement.top).toBe(500 - 100 - 6 - (500 - 6 - 12)) // card top lands at the top margin
  })

  test('aligns with the trigger and shifts left to stay inside the container', () => {
    const narrow = { width: 200, height: 100 }
    expect(placePopover({ trigger: trigger(300, 60), container, popover: narrow, viewportHeight: 800 }).left).toBe(44)
    expect(placePopover({ trigger: trigger(300, 300), container, popover: narrow, viewportHeight: 800 }).left).toBe(143)
  })
})

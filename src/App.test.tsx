import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

function setup() {
  const user = userEvent.setup()
  render(<App />)
  // Looked up each time: the reading view remounts when the student changes.
  const article = () => screen.getByRole('article')
  const triggers = () => within(article()).queryAllByRole('button')
  const trigger = (name: string) => within(article()).getByRole('button', { name })
  const support = () => screen.queryByRole('group', { name: /^Help with/ })
  const chooseStudent = (name: string) => user.click(screen.getByRole('radio', { name }))
  return { user, article, triggers, trigger, support, chooseStudent }
}

describe('reading view', () => {
  test('renders the title, grade and three real paragraphs', () => {
    const article = setup().article()
    expect(within(article).getByRole('heading', { level: 1, name: 'The Water Cycle' })).toBeInTheDocument()
    expect(within(article).getByText('Grade 6')).toBeInTheDocument()
    const paragraphs = article.querySelectorAll(':scope > div > p')
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[0]).toHaveTextContent(/^Water is always moving\..*how clouds form\.$/)
    expect(paragraphs[2]).toHaveTextContent(/^Scientists call this the water cycle\..*billions of years\.$/)
  })
})

describe('student switching', () => {
  test('lists all four students and starts with the first selected', () => {
    setup()
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['st-1', 'st-2', 'st-3', 'st-4'])
    expect(screen.getByRole('radio', { name: 'Amara' })).toBeChecked()
  })

  test('changing student updates the scaffold triggers', async () => {
    const { triggers, chooseStudent } = setup()
    expect(triggers()).toHaveLength(8) // Amara

    await chooseStudent('Diego')
    expect(screen.getByRole('radio', { name: 'Diego' })).toBeChecked()
    expect(triggers().map((t) => t.textContent)).toEqual([
      'evaporation',
      'condensation',
      'precipitation',
      'sleet',
      'the water cycle',
    ])

    await chooseStudent('Linh')
    expect(triggers().map((t) => t.textContent)).toContain('heavy enough')
  })

  test('Jonah sees the plain passage with no triggers and no warning', async () => {
    const { article, triggers, chooseStudent } = setup()
    await chooseStudent('Jonah')
    expect(triggers()).toHaveLength(0)
    expect(article()).toHaveTextContent(/Water is always moving.*billions of years\./)
    expect(screen.queryByText(/no (supports|scaffolds)/i)).not.toBeInTheDocument()
  })

  test('the student picker works with the keyboard', async () => {
    const { user, triggers } = setup()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Amara' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Diego' })).toBeChecked()
    expect(triggers()).toHaveLength(5)
  })
})

describe('scaffold interaction', () => {
  test('triggers are native buttons, collapsed until opened, with no nested controls', () => {
    const { article, trigger } = setup()
    const evaporation = trigger('evaporation')
    expect(evaporation.tagName).toBe('BUTTON')
    expect(evaporation).toHaveAttribute('type', 'button')
    expect(evaporation).toHaveAttribute('aria-expanded', 'false')
    expect(article().querySelectorAll('button button, button a, button input')).toHaveLength(0)
  })

  test('click opens support linked to its trigger', async () => {
    const { user, trigger, support } = setup()
    await user.click(trigger('evaporation'))

    const card = support()
    expect(card).toHaveAccessibleName('Help with “evaporation”')
    expect(trigger('evaporation')).toHaveAttribute('aria-expanded', 'true')
    expect(trigger('evaporation')).toHaveAttribute('aria-controls', card?.id)
    expect(card).toHaveTextContent('Definition')
    expect(card).toHaveTextContent('When liquid water turns into a gas (vapor) and rises into the air.')
  })

  test('keyboard: Tab reaches a trigger, Enter opens, Escape closes and returns focus', async () => {
    const { user, trigger, support } = setup()
    await user.tab() // student picker
    await user.tab() // first trigger in reading order
    expect(trigger('water vapor')).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(support()).toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(support()).not.toBeInTheDocument()
    expect(trigger('water vapor')).toHaveFocus()
    expect(trigger('water vapor')).toHaveAttribute('aria-expanded', 'false')
  })

  test('Space also opens support', async () => {
    const { user, trigger, support } = setup()
    trigger('sleet').focus()
    await user.keyboard(' ')
    expect(support()).toHaveTextContent('Frozen rain.')
  })

  test('the Close button closes support and returns focus to the trigger', async () => {
    const { user, trigger, support } = setup()
    await user.click(trigger('sleet'))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(support()).not.toBeInTheDocument()
    expect(trigger('sleet')).toHaveFocus()
  })

  test('activating the open trigger again closes it', async () => {
    const { user, trigger, support } = setup()
    await user.click(trigger('sleet'))
    await user.click(trigger('sleet'))
    expect(support()).not.toBeInTheDocument()
  })

  test('opening another scaffold replaces the open one', async () => {
    const { user, trigger } = setup()
    await user.click(trigger('evaporation'))
    await user.click(trigger('condensation'))
    const cards = screen.getAllByRole('group', { name: /^Help with/ })
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveAccessibleName('Help with “condensation”')
    expect(trigger('evaporation')).toHaveAttribute('aria-expanded', 'false')
  })

  test('clicking outside closes support', async () => {
    const { user, trigger, support } = setup()
    await user.click(trigger('sleet'))
    await user.click(screen.getByRole('heading', { level: 1 }))
    expect(support()).not.toBeInTheDocument()
  })

  test('switching student closes any open support', async () => {
    const { user, trigger, support, chooseStudent } = setup()
    await user.click(trigger('evaporation'))
    await chooseStudent('Diego')
    expect(support()).not.toBeInTheDocument()
  })

  test('translations are labelled by language name and marked with their language', async () => {
    const { user, trigger, support } = setup()
    await user.click(trigger('soaks into the ground'))
    expect(support()).toHaveTextContent('Spanish')
    expect(within(support()!).getByText('se filtra en la tierra')).toHaveAttribute('lang', 'es-MX')
  })

  test('simplified wording is labelled and does not replace the passage text', async () => {
    const { user, article, trigger, support } = setup()
    await user.click(trigger('depending on the temperature'))
    expect(support()).toHaveTextContent('Simpler wording')
    expect(support()).toHaveTextContent('if it is warm or cold outside')
    expect(trigger('depending on the temperature')).toBeInTheDocument()
    expect(article()).toHaveTextContent('depending on the temperature')
  })
})

describe('overlapping supports', () => {
  test('"water vapor" and nested "vapor" share one trigger', () => {
    const article = setup().article()
    expect(within(article).getAllByRole('button', { name: 'water vapor' })).toHaveLength(1)
    expect(within(article).queryByRole('button', { name: 'vapor' })).not.toBeInTheDocument()
  })

  test('each support is labelled with its own phrase and type', async () => {
    const { user, trigger, support } = setup()
    await user.click(trigger('water vapor'))

    const items = within(support()!).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(/^Definition\s*water vapor: Water in the form of a gas\./)
    expect(items[1]).toHaveTextContent(/^Spanish\s*vapor: vapor$/)
    expect(within(items[1]!).getByText('vapor', { selector: '[lang]' })).toHaveAttribute('lang', 'es')
  })

  test('for Linh, "water vapor" has only its definition', async () => {
    const { user, trigger, support, chooseStudent } = setup()
    await chooseStudent('Linh')
    await user.click(trigger('water vapor'))
    const items = within(support()!).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    // A single support needs no phrase: the trigger already names it.
    expect(items[0]).toHaveTextContent(/^Definition\s*Water in the form of a gas\./)
  })
})

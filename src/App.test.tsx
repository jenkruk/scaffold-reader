import { render, screen } from '@testing-library/react'
import { App } from './App'

// Smoke test: proves the Vitest + RTL + jest-dom toolchain is wired up.
test('renders the app heading', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1, name: 'Scaffold Reader' })).toBeInTheDocument()
})

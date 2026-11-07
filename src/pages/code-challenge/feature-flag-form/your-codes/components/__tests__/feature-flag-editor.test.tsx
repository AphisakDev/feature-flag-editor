import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FeatureFlagEditor } from '../feature-flag-editor'

// Monaco needs a real browser; a <pre> is enough to assert on the JSON.
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => (
    <pre data-testid="monaco">{value}</pre>
  ),
}))

afterEach(cleanup)

/** The preview uses useDeferredValue, so read it with findBy/waitFor semantics. */
async function previewJson() {
  const pre = await screen.findByTestId('monaco')
  return JSON.parse(pre.textContent || '{}')
}

const byId = (id: string) => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`#${id} not found`)
  return element
}

describe('<FeatureFlagEditor />', () => {
  it('shows the default flag and updates the preview while typing', async () => {
    render(<FeatureFlagEditor />)
    expect(await previewJson()).toEqual({
      flags: {
        'my-first-flag': {
          variations: { Variation_1: true, Variation_2: false },
          defaultRule: { variation: 'Variation_1' },
        },
      },
    })

    fireEvent.change(byId('flags[0].key'), {
      target: { value: 'new-checkout' },
    })
    await vi.waitFor(async () =>
      expect(Object.keys((await previewJson()).flags)).toEqual([
        'new-checkout',
      ]),
    )
  })

  it('builds nested targeting queries from the UI', async () => {
    render(<FeatureFlagEditor />)
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))

    const rule = screen.getByRole('article', { name: 'Targeting rule 1' })
    fireEvent.change(within(rule).getByPlaceholderText(/attribute/i), {
      target: { value: 'role' },
    })
    fireEvent.change(within(rule).getByPlaceholderText('Value'), {
      target: { value: 'admin' },
    })

    // Add a nested group, switch it to OR and fill its condition.
    fireEvent.click(within(rule).getByRole('button', { name: 'Group' }))
    const nested = within(rule).getByRole('group', { name: /nested group/i })
    fireEvent.click(within(nested).getByRole('radio', { name: 'or' }))
    fireEvent.change(within(nested).getByPlaceholderText(/attribute/i), {
      target: { value: 'country' },
    })
    fireEvent.change(within(nested).getByPlaceholderText('Value'), {
      target: { value: 'TH' },
    })
    fireEvent.click(within(nested).getByRole('button', { name: 'Condition' }))
    const [, second] = within(nested).getAllByPlaceholderText(/attribute/i)
    fireEvent.change(second, { target: { value: 'beta' } })
    const operators = within(nested).getAllByRole('combobox', {
      name: 'Operator',
    })
    fireEvent.change(operators[1], { target: { value: 'pr' } })

    await vi.waitFor(async () => {
      const json = await previewJson()
      expect(json.flags['my-first-flag'].targeting).toEqual([
        {
          name: 'Rule 1',
          query: 'role eq "admin" and (country eq "TH" or beta pr)',
          variation: 'Variation_1',
        },
      ])
    })
  })

  it('blocks export and points to the problem when the form is invalid', async () => {
    const onExport = vi.fn()
    render(<FeatureFlagEditor onExport={onExport} />)

    fireEvent.change(byId('flags[0].key'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    expect(
      await screen.findAllByText('Flag name is required'),
    ).not.toHaveLength(0)
    expect(onExport).not.toHaveBeenCalled()

    fireEvent.change(byId('flags[0].key'), { target: { value: 'fixed-flag' } })
    fireEvent.click(screen.getByRole('button', { name: /export/i }))
    await vi.waitFor(() => expect(onExport).toHaveBeenCalledTimes(1))
    expect(JSON.parse(onExport.mock.calls[0][0])).toHaveProperty([
      'flags',
      'fixed-flag',
    ])
  })

  it('manages roles and lets conditions pick them', async () => {
    render(<FeatureFlagEditor />)

    // Define a new role in the shared catalog.
    const roles = screen.getByRole('region', { name: 'Roles' })
    fireEvent.click(within(roles).getByRole('button', { name: 'Add role' }))
    const names = within(roles).getAllByPlaceholderText('admin')
    fireEvent.change(names[names.length - 1], { target: { value: 'auditor' } })

    // A condition on `role` with "In list" shows the roles as chips.
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    const rule = screen.getByRole('article', { name: 'Targeting rule 1' })
    fireEvent.change(within(rule).getByPlaceholderText(/attribute/i), {
      target: { value: 'role' },
    })
    fireEvent.change(within(rule).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'in' },
    })
    const picker = within(rule).getByRole('group', { name: 'Roles:' })
    fireEvent.click(within(picker).getByRole('button', { name: 'admin' }))
    fireEvent.click(within(picker).getByRole('button', { name: 'auditor' }))

    await vi.waitFor(async () => {
      const json = await previewJson()
      expect(json.flags['my-first-flag'].targeting[0].query).toBe(
        'role in ["admin", "auditor"]',
      )
    })
    expect(screen.getByText('Valid')).toBeTruthy()

    // An undefined role is reported on the value field.
    fireEvent.change(within(rule).getByPlaceholderText('admin, editor'), {
      target: { value: 'admin, ghost' },
    })
    expect(
      await within(rule).findByText(
        'Unknown role "ghost" — define it in Roles & Groups',
      ),
    ).toBeTruthy()
  })
})

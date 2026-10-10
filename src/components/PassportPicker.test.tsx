import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PassportPicker } from './PassportPicker'

describe('PassportPicker', () => {
  it('searches, adds, and removes a passport', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<PassportPicker selected={[]} onChange={onChange} onContinue={vi.fn()}/>)
    await user.type(screen.getByRole('combobox'), 'Singapore')
    await user.click(screen.getByRole('option'))
    expect(onChange).toHaveBeenCalledWith(['SG'])
    rerender(<PassportPicker selected={['SG']} onChange={onChange} onContinue={vi.fn()}/>)
    await user.click(screen.getByRole('button', { name: 'Remove Singapore' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('requires explicit completion', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<PassportPicker selected={['IN']} onChange={vi.fn()} onContinue={onContinue}/>)
    await user.click(screen.getByRole('button', { name: /See destinations/i }))
    expect(onContinue).toHaveBeenCalledOnce()
  })
})

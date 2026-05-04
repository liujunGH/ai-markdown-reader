import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SourceView } from '../../components/SourceView'

describe('SourceView', () => {
  it('edits and saves source content when enabled', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(<SourceView content="# Old" editable onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: '编辑' }))
    const editor = screen.getByRole('textbox')
    await user.clear(editor)
    await user.type(editor, '# New')
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(onSave).toHaveBeenCalledWith('# New')
  })
})

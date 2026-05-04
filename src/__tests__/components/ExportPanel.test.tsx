import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ExportPanel } from '../../components/ExportPanel'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'exportPanel.title': '导出文档',
      'exportPanel.exportHTML': '导出为 HTML',
      'exportPanel.nativePDF': '导出 PDF 文件',
      'exportPanel.printPDF': '打印 / 导出为 PDF',
      'exportPanel.copyPlainText': '复制为纯文本',
      'exportPanel.copyRichText': '复制为富文本',
      'exportPanel.pdfSuccess': 'PDF 导出成功',
      'common.cancel': '取消',
    }[key] ?? key),
  }),
}))

describe('ExportPanel', () => {
  it('uses the native PDF export API when available', async () => {
    const user = userEvent.setup()
    const exportPDF = vi.fn(async () => ({ success: true, filePath: '/tmp/doc.pdf' }))
    window.electronAPI = {
      exportHTMLToPDF: exportPDF,
    } as unknown as Window['electronAPI']

    render(
      <ExportPanel
        isOpen
        onClose={vi.fn()}
        fileName="doc.md"
        fileContent="# Title\n\nBody"
        filePath="/docs/doc.md"
        theme="light"
        accentColor="#2b7de1"
      />
    )

    await user.click(screen.getByRole('button', { name: /导出 PDF 文件/ }))

    await waitFor(() => {
      expect(exportPDF).toHaveBeenCalledWith(expect.objectContaining({
        html: expect.stringContaining('<h1'),
        defaultPath: 'doc.pdf',
        title: 'doc',
      }))
    })
    expect(await screen.findByText('PDF 导出成功')).toBeInTheDocument()
  })
})

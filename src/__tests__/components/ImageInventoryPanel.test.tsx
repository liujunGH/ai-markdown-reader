import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ImageInventoryPanel } from '../../components/ImageInventoryPanel'

describe('ImageInventoryPanel', () => {
  it('shows repair suggestions for image references', () => {
    render(
      <ImageInventoryPanel
        content="![Missing](./missing.png)\n![Remote](https://example.com/a.png)"
        filePath={undefined}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('本地相对图片没有解析到文件；检查路径拼写，或把图片放到 Markdown 同级/子目录。')).toBeInTheDocument()
    expect(screen.getByText('网络图片依赖外部访问；离线使用时建议下载到本地并改成相对路径。')).toBeInTheDocument()
  })
})

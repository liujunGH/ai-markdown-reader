/**
 * Markdown 解析 Worker（v2）
 *
 * 职责：按安全边界分段解析 Markdown，并增量返回只含源码和元数据的块模型。
 * 不生成 HTML、不做净化；可见块由 block-render.worker 按批次渲染，主线程再净化。
 *
 * 相比旧 worker：
 *  - 旧 worker 返回整篇 HTML 字符串，主线程一次性 dangerouslySetInnerHTML + 整篇净化
 *  - 新 worker 首段完成即可返回块模型，后续分段继续扩展目录和总行数
 *  - 主线程用虚拟列表选择可见区，独立 worker 按需生成块 HTML，再做块级净化
 *  - 解析逻辑（tokenizer/createParser）抽成共享模块，主线程 fallback 可复用
 *
 * 协议：{ id, content } → 多条 { id, blocks, outline, done:false } → { id, done:true }
 * 用 id 配对请求/响应，支持取消过期请求（切换文档时）。
 */
import { parseDocumentInSegments } from '../pipeline/parseDocumentSegments'
import type { ParseRequest, ParseResponse } from '../types'

self.onmessage = async (e: MessageEvent<ParseRequest>) => {
  const { id, content } = e.data

  try {
    const document = await parseDocumentInSegments(content, {
      yieldBetweenSegments: true,
      onSegment: (segment) => {
        const response: ParseResponse = { id, ...segment, done: false }
        self.postMessage(response)
      },
    })
    const response: ParseResponse = {
      id,
      totalLines: document.totalLines,
      referenceDefinitions: document.referenceDefinitions,
      done: true,
    }
    self.postMessage(response)
  } catch (error) {
    const response: ParseResponse = {
      id,
      done: true,
      error: error instanceof Error
        ? `${error.message}\n${error.stack || ''}`
        : String(error),
    }
    self.postMessage(response)
  }
}

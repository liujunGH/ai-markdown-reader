/**
 * Markdown 解析 Worker（v2）
 *
 * 职责：解析 markdown → 切成 DocumentBlock[] → 返回 ParsedDocument。
 * 不做净化（净化在主线程块级做，见 sanitizer/config.ts 策略说明）。
 *
 * 相比旧 worker：
 *  - 旧 worker 返回整篇 HTML 字符串，主线程一次性 dangerouslySetInnerHTML + 整篇净化
 *  - 新 worker 返回块模型，主线程用虚拟列表按可见区间渲染，块级净化
 *  - 解析逻辑（tokenizer/createParser）抽成共享模块，主线程 fallback 可复用
 *
 * 协议：{ id, content } → { id, document | null, error? }
 * 用 id 配对请求/响应，支持取消过期请求（切换文档时）。
 */
import { createParser, loadPrismLanguage, scanCodeLanguages } from '../pipeline/tokenizer'
import { splitIntoBlocks } from '../pipeline/blockModel'
import type { ParseRequest, ParseResponse } from '../types'

self.onmessage = async (e: MessageEvent<ParseRequest>) => {
  const { id, content } = e.data

  try {
    const { md, prism } = await createParser()

    // 预加载文档内出现的代码语言
    const langs = scanCodeLanguages(content)
    if (langs.length > 0) {
      await Promise.all(langs.map((lang) => loadPrismLanguage(prism, lang)))
    }

    // 解析成 token 流，再切成块
    const tokens = md.parse(content, {})
    const document = splitIntoBlocks(tokens, md, content)

    const response: ParseResponse = { id, document }
    self.postMessage(response)
  } catch (error) {
    const response: ParseResponse = {
      id,
      document: null,
      error: error instanceof Error ? error.message : String(error),
    }
    self.postMessage(response)
  }
}

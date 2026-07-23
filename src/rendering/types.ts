/**
 * 渲染块模型类型定义
 *
 * 文档被切成 DocumentBlock[]，每个块是一个可独立渲染/回收的最小单元。
 * 块边界 = markdown-it 的顶层 token 边界（标题/段落/代码块/表格/列表/引用...），
 * 绝不在表格/代码块中间切断（旧 VirtualMarkdown 按 160 行粗暴切分的缺陷）。
 *
 * 虚拟列表只渲染可见区间内的块，滚出视口自动卸载——内存恒定。
 */

/** 块类型，对应 markdown-it 顶层块级 token */
export type BlockKind =
  | 'heading' // h1-h6
  | 'paragraph' // 普通段落
  | 'code' // 代码块（含 mermaid/diff/fence/code_block）
  | 'table' // 表格
  | 'list' // 列表（ul/ol，含 task list）
  | 'blockquote' // 引用块
  | 'hr' // 水平线
  | 'html' // 原生 HTML 块（html:false 时极少）
  | 'math' // 块级公式 $$...$$

/**
 * 一个文档块。
 * 块的 HTML 是已净化的（worker 内 DOMPurify），主线程直接注入无需再净化。
 */
export interface DocumentBlock {
  /** 块在文档中的唯一序号（虚拟列表 key） */
  id: number
  /** 块类型 */
  kind: BlockKind
  /** 已净化的 HTML 片段（含该块的所有内容） */
  html: string
  /** 该块在原始 markdown 中的起始行号（1-based，用于行跳转定位） */
  startLine: number
  /** 该块在原始 markdown 中的结束行号（1-based） */
  endLine: number
  /** 块的预估高度（px），虚拟列表初始化用，滚动后由 measureElement 校正 */
  estimatedHeight: number
  /** 块的元数据（锚点 id / 代码语言 / 是否含 mermaid 等，供 DOM 增强用） */
  meta?: BlockMeta
}

/** 块元数据，供主线程 DOM 增强（锚点、代码折叠、mermaid 渲染等）参考 */
export interface BlockMeta {
  /** 标题块的 slugify id（供大纲/scrollspy/锚点跳转） */
  headingId?: string
  /** 标题级别 1-6 */
  headingLevel?: number
  /** 标题文本 */
  headingText?: string
  /** 代码块语言 */
  codeLang?: string
  /** 代码块行数（供折叠判断 >15 行） */
  codeLines?: number
  /** 是否含 mermaid 图（主线程需异步渲染 SVG） */
  hasMermaid?: boolean
  /** 是否含本地图片（需解析路径转 data URL） */
  hasLocalImage?: boolean
  /** 是否含 task list（需 checkbox 改造） */
  hasTaskList?: boolean
}

/** 解析结果：块数组 + 文档级元信息 */
export interface ParsedDocument {
  blocks: DocumentBlock[]
  /** 文档总行数 */
  totalLines: number
  /** 所有标题（供大纲，与块内 headingId 对应） */
  outline: Array<{ id: string; level: number; text: string; line: number }>
}

/** parse.worker 的请求消息 */
export interface ParseRequest {
  /** 请求 id，用于响应配对 */
  id: number
  /** 原始 markdown 内容 */
  content: string
}

/** parse.worker 的响应消息 */
export interface ParseResponse {
  id: number
  /** 解析成功时的文档块模型；失败时为 null */
  document: ParsedDocument | null
  /** 错误信息 */
  error?: string
}

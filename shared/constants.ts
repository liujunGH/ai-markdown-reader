/**
 * 跨进程共享常量 (Single Source of Truth)
 *
 * 被 main 进程与渲染进程同时引用。约束同 ipc-channels.ts：
 * 仅纯常量，禁止 Node / Electron 依赖。
 *
 * 修改这里的限制会同时作用于主进程校验与渲染端提示，保持一致。
 */

/* ============================================================
 * 文件大小限制（字节）
 * ============================================================ */

/** Markdown 文件读取上限：50MB（open-file-dialog / read-file） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 图片读取上限：20MB（download-remote-image / read-image-as-data-url） */
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024

/** open-text-file IPC 独立上限：5MB（该通道仅用于读取小型文本，如备份导入） */
export const MAX_TEXT_FILE_SIZE = 5 * 1024 * 1024

/* ============================================================
 * 图片 MIME 白名单
 * ============================================================ */

export const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = Object.freeze({
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
})

/** 判断扩展名是否为受支持的图片格式 */
export function isSupportedImageExt(ext: string): boolean {
  return ext.toLowerCase() in IMAGE_MIME_TYPES
}

/* ============================================================
 * Markdown 扩展名
 * ============================================================ */

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'] as const

/** 判断路径是否为 Markdown 文件 */
export function isMarkdownPath(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/* ============================================================
 * 文件夹扫描跳过目录
 * ============================================================ */

/** 扫描时默认跳过的目录名（与渲染端索引设置可叠加） */
export const DEFAULT_SKIP_DIRECTORIES: ReadonlySet<string> = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  'dist',
  'build',
  'release',
  '.next',
  '.cache',
])

/** 判断目录名是否应跳过：命中默认列表 或 以点开头（隐藏目录） */
export function shouldSkipScanDirectory(
  name: string,
  extraSkip?: ReadonlyArray<string>
): boolean {
  if (DEFAULT_SKIP_DIRECTORIES.has(name)) return true
  if (name.startsWith('.')) return true
  if (extraSkip && extraSkip.includes(name)) return true
  return false
}

/* ============================================================
 * 最近文件 / 标签上限
 * ============================================================ */

export const DEFAULT_MAX_RECENT_FILES = 100
export const DEFAULT_MAX_TABS = 10

/* ============================================================
 * IPC 限流（主进程 fileDialogLimiter）
 * ============================================================ */

/** 对话框类 IPC 限流：每窗口内 5 次 / 秒 */
export const FILE_DIALOG_RATE_LIMIT = { maxCalls: 5, windowMs: 1000 }

/* ============================================================
 * 资源层 LRU 容量
 * ============================================================ */

/** DocumentCache 最多常驻的文档正文数量（超出按 LRU 淘汰，重新从磁盘读） */
export const DOCUMENT_CACHE_CAPACITY = 4

/** ImageCache 最多常驻的 data URL 数量（图片 base URL 内存放大 ~33%） */
export const IMAGE_CACHE_CAPACITY = 40

/* ============================================================
 * 渲染层阈值
 * ============================================================ */

/**
 * 触发虚拟渲染的阈值。
 * 新架构下统一走虚拟列表，这些阈值用于决定是否预先测量全部块高度
 * （小文档可一次性测量，大文档按可见区间懒测量）。
 */
export const VIRTUAL_RENDER_BYTE_THRESHOLD = 300_000
export const VIRTUAL_RENDER_LINE_THRESHOLD = 5_000

/** 大文档搜索防抖阈值：超过此字节数时，搜索输入加防抖 */
export const LARGE_DOCUMENT_SEARCH_THRESHOLD = 1_000_000
export const LARGE_DOCUMENT_SEARCH_DELAY_MS = 100

/** 文内搜索默认匹配上限 */
export const DEFAULT_SEARCH_MATCH_LIMIT = 100

/** scrollSpy 监听的标题上限（超出只取前 N 个，避免 IntersectionObserver 过载） */
export const MAX_SCROLL_SPY_HEADINGS = 800

/* ============================================================
 * 安全：路径白名单标识
 *
 * 实际的 safe roots 由主进程 app.getPath() 解析得到，
 * 此处仅声明白名单的「路径类型」，供主进程 ipcGuard 使用。
 * ============================================================ */

export const SAFE_PATH_KEYS = [
  'home',
  'userData',
  'temp',
  'desktop',
  'documents',
  'downloads',
] as const

export type SafePathKey = (typeof SAFE_PATH_KEYS)[keyof typeof SAFE_PATH_KEYS]

/** 危险协议（链接 href 命中即禁用） */
export const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'] as const

/** 外部链接协议（在系统浏览器打开） */
export const EXTERNAL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'] as const

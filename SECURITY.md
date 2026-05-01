# 安全策略

## 支持版本

| 版本 | 支持状态 |
|------|----------|
| v1.5.1 | ✅ 当前支持 |
| v1.4.x - v1.5.0 | ⚠️ 仅关键安全修复 |
| v1.3.x 及更早 | ❌ 不再支持 |

## 安全加固说明 (v1.5.1+)

本项目在 v1.4.0 到 v1.5.1 中持续进行了安全加固：

### 路径遍历防护
所有文件操作 IPC（`read-file`、`read-folder`、`watch-file`、`get-file-info`、`show-in-folder`）均经过 `isPathSafe()` 验证：
- 拒绝包含 `..` 的相对路径遍历
- 只允许用户目录下的合法绝对路径（Home、Desktop、Documents、Downloads、temp 等）
- v1.5.1 起使用 `realpath` 边界校验，拒绝通过符号链接跳出安全目录

### 内容安全策略 (CSP)
```
default-src 'self';
style-src 'self' 'unsafe-inline';
script-src 'self';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self';
```

### Markdown 渲染安全
- `markdown-it` 配置 `html: false`，禁止原始 HTML 注入
- DOMPurify 白名单移除了 `style` 属性和 SVG 标签
- Mermaid `securityLevel: 'strict'`
- KaTeX 使用 `markdown-it-texmath + katex`，替换旧的 `markdown-it-katex`
- KaTeX 配置 `trust: false`、`throwOnError: false`，不信任输入中的危险命令

### 资源本地化
- KaTeX CSS 由 Vite 本地打包，不再依赖外部 CDN

## 已知依赖审计项

`npm audit --omit=dev` 当前仍会报告 Mermaid 间接依赖 `uuid` 的 moderate 项：

- 来源：`mermaid -> uuid`
- 审计项：`uuid <14.0.0`
- npm 自动修复建议：`npm audit fix --force`

暂不执行强制修复，原因是该命令会把 Mermaid 降级到 `9.1.7`，属于破坏性回退，可能影响图表兼容性和现有渲染能力。当前项目已将 Mermaid 动态加载，并使用 `securityLevel: 'strict'`；普通文档不会加载 Mermaid。后续会在 Mermaid 或其依赖链提供兼容修复后再升级处理。

## 报告安全问题

如果您发现安全漏洞，请通过以下方式报告：

1. **GitHub Security Advisories**: [创建私人安全建议](https://github.com/liujunGH/ai-markdown-reader/security/advisories/new)
2. **Email**: 在 GitHub 个人资料中查找联系方式

请在报告中包含：
- 漏洞描述和影响范围
- 复现步骤（如可能）
- 受影响的版本号
- 建议的修复方案（如有）

我们承诺在收到报告后的 7 个工作日内进行初步响应。

# E2E 测试

本项目使用 [Playwright](https://playwright.dev/) 对 Electron 应用进行端到端测试。

## 前置条件

在运行 E2E 测试之前，请确保：

1. **Node.js 依赖已安装**
   ```bash
   npm install
   ```

2. **Electron 主进程已编译**
   ```bash
   npm run electron:compile
   ```

3. **前端生产构建产物已生成**
   ```bash
   npm run build
   ```

   > 如果 `electron/main.js` 或 `dist/index.html` 不存在，测试会自动启动失败，提示需要先执行编译和构建。

## 运行测试

### 命令行模式（无界面，适合 CI）

```bash
npm run e2e
```

### 有界面模式（调试时使用）

```bash
npm run e2e:headed
```

## 测试配置

- **配置文件**: `playwright.config.ts`
- **测试目录**: `e2e/`
- **测试入口**: `electron/main.js`（编译后的 Electron 主进程）
- **Headless 支持**: 已在配置中启用，CI 环境下自动生效

## 工作原理

测试启动时：

1. Playwright 会先启动 `vite preview` 作为静态文件服务器（端口 `5173`）。
2. 随后通过 `_electron.launch()` 启动 Electron 应用，主进程入口指向 `electron/main.js`。
3. Electron 窗口加载 `http://localhost:5173`（即生产构建产物）。
4. 测试执行断言（窗口标题、DOM 元素可见性等）。

## 注意事项

- 不需要手动启动开发服务器，Playwright 的 `webServer` 配置会自动处理。
- 如果在本地已经运行了 `npm run dev`（同样占用 `5173` 端口），Playwright 会复用现有服务器。
- 测试使用 TypeScript 编写，Playwright 内置 TypeScript 支持，无需额外编译。

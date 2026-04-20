# 发布流程

## 1. 发布前检查

### 1.1 确认最新版本
```bash
# 查看本地最新 tag
git tag --sort=-version:refname | head -5

# 查看 GitHub 最新 release
gh release list --limit 5
```

### 1.2 更新版本号
修改 `package.json` 中的 `"version"` 字段：
- **patch** (x.y.Z): Bug 修复
- **minor** (x.Y.z): 新功能，向后兼容
- **major** (X.y.z): 破坏性变更

### 1.3 更新文档
- 在 `CHANGELOG.md` 顶部添加新版本变更记录
- 更新 `README.md` 中的版本号徽章
- 更新 `SECURITY.md` 中的支持版本表（如适用）

### 1.4 构建验证
```bash
npm run lint          # TypeScript 类型检查
npm run build         # Vite 构建
npm run electron:compile  # Electron 主进程编译
```

## 2. 提交与打标签

```bash
git add -A
git commit -m "release: v{x.y.z}"
git push origin main

git tag v{x.y.z}
git push origin v{x.y.z}
```

## 3. CI 自动构建

推送 tag 后，GitHub Actions 会自动触发：
- **macOS** (`macos-latest`): 构建 x64 + arm64 DMG
- **Ubuntu** (`ubuntu-latest`): 构建 AppImage + deb
- **Windows** (`windows-latest`): 构建 NSIS exe

CI 配置: `.github/workflows/build.yml`

### CI 环境变量（如需代码签名）
在仓库 Settings → Secrets 中配置：
- `CSC_LINK` / `CSC_KEY_PASSWORD` — Windows/macOS 代码签名证书
- `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` — macOS 公证

## 4. 手动构建（备用）

如果 CI 失败或需要本地测试：

```bash
# macOS
npm run electron:build:mac

# Windows（需 Wine，macOS/Linux 上）
npm run electron:build

# Linux
npm run electron:build:linux
```

## 5. 验证 Release

```bash
# 查看 release 详情
gh release view v{x.y.z}

# 确认所有 asset 已上传
gh release view v{x.y.z} --json assets
```

## 6. 常见问题

### macOS 未签名应用首次打开
用户需在 Finder 中右键应用 → "打开"，或在终端执行：
```bash
xattr -cr /Applications/Markdown\ Reader.app
```

### Release 已存在导致上传失败
使用 `--clobber` 强制覆盖：
```bash
gh release upload v{x.y.z} "release/*.dmg" --clobber
```

### 图标缺失
放置 `build/icon.png`（1024×1024）后重新打包。未提供时使用默认 Electron 图标。

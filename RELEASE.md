# 发布检查清单

## 发行前必读

每次发行前必须完成以下检查事项。

## 1. 查询 GitHub 最新版本

在发行前，必须先查询 GitHub 上的最新版本号：

```bash
# 查看已存在的 release tags
gh release list

# 查看当前仓库的所有 tags
git tag -l

# 查看最新的 tag 版本
git tag --sort=-version:refname | head -1
```

## 2. 更新版本号

当前版本号在 `package.json` 中，格式为 `x.y.z`：

- **patch** (x.y.Z): 小修复，如 bug 修复
- **minor** (x.Y.z): 新功能，向后兼容
- **major** (X.y.z): 破坏性变更

修改 `package.json` 中的 `"version"` 字段。

## 3. 更新 README.md

确保更新日志包含所有新功能：

```markdown
## 更新日志

### v{x.y.z}
- 新增：...
- 修复：...
- 优化：...
```

## 4. 代码提交

```bash
git add .
git commit -m "v{x.y.z}: 更新说明"
git push origin main
git push origin v{x.y.z}
```

## 5. GitHub Actions 自动构建

推送到 main 分支后，GitHub Actions 会自动：
1. 构建 Windows 版本 (.exe)
2. 构建 macOS 版本 (.dmg) - 需要手动触发或配置
3. 构建 Linux 版本

**注意**：如果使用 `gh release create` 失败（因为 release 已存在），workflow 会失败。需要确保 workflow 脚本能处理已存在的 release。

## 6. macOS 版本手动处理

macOS 版本目前在 GitHub Actions 上构建会失败，需要手动：

```bash
# 1. 确保代码已推送到 GitHub
git push origin main

# 2. 触发 workflow
gh workflow run build.yml

# 3. 如果 Windows release 创建失败（因为已存在），workflow 会失败
# 需要修改 workflow 支持编辑已存在的 release

# 4. 手动构建 macOS（如果需要）
npm run electron:build:mac

# 5. 上传 macOS dmg 到已存在的 release
gh release upload v{x.y.z} "/path/to/Markdown Reader-{version}.dmg" --clobber
```

## 7. Windows 版本上传

如果 workflow 失败，需要手动上传：

```bash
# 下载 GitHub Actions 构建的 artifact
gh run download <run-id>

# 或者手动构建
npm run electron:build

# 上传到 release
gh release upload v{x.y.z} "release/*.exe" --clobber
```

## 8. 验证 Release

发布后验证：

```bash
# 查看 release 详情
gh release view v{x.y.z}

# 确认所有 asset 都已上传
gh release view v{x.y.z} --json assets
```

确认 Windows .exe 和 macOS .dmg 都已上传。

## 常见问题

### Q: gh release create 报 422 错误
A: release 已存在，使用 `gh release edit` 或修改 workflow 脚本

### Q: GitHub Actions 没有触发
A: 检查 workflow 文件在 `.github/workflows/` 目录下，且 push 到了正确的分支

### Q: macOS 构建失败
A: GitHub Actions 在 Ubuntu 上无法构建 macOS，需要手动本地构建并上传

## 关键原则

1. **先查询最新版本** - 不要假设你知道最新版本号
2. **workflow 会创建 release** - 不要手动创建，会导致冲突
3. **macOS 需要手动** - GitHub Actions 不支持跨平台构建 macOS
4. **检查 release 是否存在** - 再决定创建还是编辑

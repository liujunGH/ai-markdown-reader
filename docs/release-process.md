# Release Process / 发布流程

## 1. 发布前检查

### 1.1 查询最新版本号
```bash
# GitHub API 查询最新 release
curl -s -u <username>:<token> \
  "https://api.github.com/repos/<owner>/<repo>/releases/latest" \
  | grep '"tag_name"'
```

### 1.2 确定新版本号
- **主版本.次版本.修订号** 格式
- Bug 修复: 修订号 +1 (如 1.1.4 → 1.1.5)
- 新功能: 次版本号 +1 (如 1.1.4 → 1.2.0)
- 重大更新: 主版本号 +1

### 1.3 更新 package.json 版本号
```json
{
  "version": "1.1.5"
}
```

## 2. 提交代码
```bash
git add -A
git commit -m "release: bump version to 1.1.5"
git push origin main
```

## 3. 推送 Git Tag
```bash
git tag 1.1.5
git push origin 1.1.5
```

## 4. 验证 GitHub Actions
- 访问 https://github.com/<owner>/<repo>/actions
- 确认 Build Desktop App workflow 运行成功
- 确认 Release 产物已上传

## 5. 验证 Release
- 访问 https://github.com/<owner>/<repo>/releases
- 确认新版本已发布
- 下载并测试安装包

---

## 当前项目最新版本

| 项目 | 版本 |
|------|------|
| GitHub Release | v1.1.4 |
| package.json | 1.1.5 |

**下次发布版本: v1.1.5**

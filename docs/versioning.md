# 版本管理指南

本项目使用 [Changesets](https://github.com/changesets/changesets) 进行版本管理，支持 Monorepo 多包版本控制和自动 Changelog 生成。

## 版本策略

项目采用**混合模式**版本管理：

### Apps（独立版本）

每个应用独立管理版本号：

- `apps/web` - Web 应用
- `apps/server` - Server 应用
- `apps/native` - Native 应用

### Packages（统一版本）

所有 `@folionote/*` 包共享同一版本号：

- `@folionote/api`
- `@folionote/auth`
- `@folionote/config`
- `@folionote/db`
- `@folionote/locales`
- `@folionote/constants`
- `@folionote/transactional`

## 日常开发流程

### 1. 创建 Changeset

当你完成一个功能或修复时，需要创建一个 changeset 来记录这次变更：

```bash
pnpm changeset
```

按照提示操作：

1. 选择受影响的包
2. 选择版本类型（patch/minor/major）
3. 输入变更描述

这会在 `.changeset/` 目录下创建一个 markdown 文件，例如：

```markdown
---
"@folionote/api": minor
"web": patch
---

添加新的搜索 API 端点
```

### 2. 提交代码

将 changeset 文件和代码变更一起提交：

```bash
git add .
git commit -m "feat(api): add search endpoint"
```

### 3. 查看变更状态

查看当前待处理的变更：

```bash
pnpm changeset:status
```

## 版本类型说明

遵循 [Semantic Versioning](https://semver.org/)：

| 类型  | 适用场景                                   | 示例              |
| ----- | ------------------------------------------ | ----------------- |
| patch | Bug 修复、文档更新、内部重构               | `0.1.0` → `0.1.1` |
| minor | 新功能（向后兼容）                         | `0.1.0` → `0.2.0` |
| major | 破坏性变更（不向后兼容），API 改变、删除等 | `0.1.0` → `1.0.0` |

## 版本更新流程

### 自动版本更新

1. 合并 PR 到 `main` 分支
2. CI 自动检测 changeset 文件
3. 创建 "Version Packages" PR
4. 审核并合并 Version PR
5. 自动更新版本号并生成 Changelog

## 常用命令

| 命令                    | 说明                         |
| ----------------------- | ---------------------------- |
| `pnpm changeset`        | 创建新的 changeset           |
| `pnpm changeset:status` | 查看待处理的变更             |
| `pnpm run version`      | 更新版本号（消费 changeset） |
| `pnpm run version:tag`  | 更新版本号并创建 Git tags    |

## 配置说明

配置文件：`.changeset/config.json`

```json
{
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "jiantianjianghui/folio" }
  ],
  "commit": false,
  "fixed": [
    [
      "@folionote/api",
      "@folionote/auth",
      "@folionote/config",
      "@folionote/db",
      "@folionote/locales",
      "@folionote/constants",
      "@folionote/transactional"
    ]
  ],
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

关键配置：

- `fixed`：锁定版本的包组，这些包会同步升级版本
- `updateInternalDependencies`：内部依赖更新策略

## FAQ

### Q: 什么时候需要创建 changeset？

当你的变更会影响到包的使用者时，需要创建 changeset：

- 添加新功能
- 修复 Bug
- 更改 API
- 更新依赖（如果会影响使用者）

不需要创建 changeset 的情况：

- 仅更新文档
- 仅更改测试代码
- 仅更改开发工具配置

### Q: 忘记创建 changeset 怎么办？

在合并 PR 之前，可以追加创建 changeset：

```bash
pnpm changeset
git add .changeset/
git commit --amend
```

### Q: 如何同时更新多个包的版本？

运行 `pnpm changeset` 时选择多个包即可。对于 fixed 组的包（`@folionote/*`），只需选择其中一个，所有包会同步更新。

### Q: 如何撤销一个 changeset？

直接删除 `.changeset/` 目录下对应的 markdown 文件：

```bash
rm .changeset/xxx-xxx-xxx.md
```

### Q: 预发布版本（prerelease）如何处理？

进入预发布模式：

```bash
pnpm changeset pre enter alpha  # 或 beta, rc
```

退出预发布模式：

```bash
pnpm changeset pre exit
```

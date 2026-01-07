# Entry 分享与隐私功能

## 功能概述

为 FolioNote 实现了两个核心功能：

1. **分享功能**：用户可以生成分享链接，支持公开/密码保护/过期时间三种模式
2. **隐私功能**：用户可以给 Entry 设置密码保护，打开时需要输入密码

## 数据库变更

### 新增表 `entry_shares`

用于存储分享链接的配置信息：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| entry_id | text | 关联的 Entry ID |
| user_id | text | 创建者用户 ID |
| share_token | text | 分享 token（用于生成 URL） |
| password_hash | text | 密码哈希（可选） |
| expires_at | timestamp | 过期时间（可选） |
| show_branding | boolean | 是否显示品牌标识 |
| is_active | boolean | 是否启用 |
| view_count | integer | 访问次数 |
| last_viewed_at | timestamp | 最后访问时间 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 扩展 `entries` 表

新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| password_hash | text | Entry 本身的密码保护哈希 |

## API 接口

### Shares Router (`packages/api/src/routers/shares.ts`)

| 方法 | 说明 | 认证 |
|------|------|------|
| `shares.create` | 创建分享链接 | 需要 |
| `shares.getByEntry` | 获取 Entry 的所有分享链接 | 需要 |
| `shares.update` | 更新分享配置 | 需要 |
| `shares.delete` | 删除分享链接 | 需要 |
| `shares.getPublicEntry` | 公开获取分享的 Entry | 不需要 |
| `shares.checkRequiresPassword` | 检查分享是否需要密码 | 不需要 |

### Entries Router 扩展

| 方法 | 说明 |
|------|------|
| `entries.setPassword` | 设置/更新 Entry 密码 |
| `entries.removePassword` | 移除 Entry 密码 |
| `entries.verifyPassword` | 验证 Entry 密码 |
| `entries.checkPassword` | 检查 Entry 是否有密码 |

## 前端组件

### Web 端

| 组件 | 路径 | 说明 |
|------|------|------|
| `ShareDialog` | `apps/web/src/components/share-dialog.tsx` | 分享链接管理弹窗 |
| `EntryPasswordDialog` | `apps/web/src/components/entry-password-dialog.tsx` | Entry 密码保护弹窗 |
| Share Page | `apps/web/src/routes/share/$token.tsx` | 公开分享页面 |

### Native 端

| 组件 | 路径 | 说明 |
|------|------|------|
| `ShareSheet` | `apps/native/components/share-sheet.tsx` | 分享配置底部弹窗 |
| `EntryPasswordSheet` | `apps/native/components/entry-password-sheet.tsx` | 密码保护底部弹窗 |

## 使用方式

### Web 端

1. 在 Entry 编辑页面点击右上角的「更多」按钮
2. 选择「分享」可以创建/管理分享链接
3. 选择「密码保护」可以设置/移除 Entry 密码

### Native 端

1. 在 Entry 详情页面点击右上角的分享图标
2. 点击锁图标可以设置/移除密码保护

## 分享链接格式

```
https://your-domain.com/share/{shareToken}
```

## 安全考虑

- 密码使用 bcrypt 哈希存储（10 轮加盐）
- 分享 token 使用 nanoid 生成（21 字符）
- 过期检查在 API 层进行
- 分享页面不暴露用户信息

## 国际化

支持以下语言：

- 英语 (en-US)
- 简体中文 (zh-CN)
- 日语 (ja-JP)

翻译键位于 `packages/locales/src/resources/` 目录下，包括：

- `share.*` - 分享相关翻译
- `privacy.*` - 密码保护相关翻译

## 数据库迁移

迁移文件位于 `packages/db/src/migrations/0001_crazy_deathstrike.sql`

### 应用迁移

开发环境：

```bash
pnpm db:push
```

生产环境：

```bash
pnpm db:migrate:prod
```

# 跨子域登录后无法保持会话（web → api）排查与修复

## 现象

- 从 `web.folionote.xyz` 发起登录到 `api.folionote.xyz` 显示成功。
- 跳转到 `/dashboard` 后又回到 `/login`，表现为“登录后无法成功重定向”。

## 根因

Web 端的路由守卫会在进入受保护页面前调用 `getUser()`：

- `apps/web/src/routes/_app.tsx` → `getUser()`
- `getUser()` 通过 `authMiddleware` 调用 `authClient.getSession()`，并把 **当前请求的 headers（包含 Cookie）** 转发给 `api`。

当 Better Auth 的 session cookie 是 **host-only（仅 `api.folionote.xyz`）** 时：

- 浏览器请求 `web.folionote.xyz` 不会携带 `api.folionote.xyz` 的 cookie
- `getSession()` 拿不到 session → 判定未登录 → 重定向回 `/login`

## 修复方式

在 `packages/auth/src/index.ts` 启用 Better Auth 的 `crossSubDomainCookies`，让 cookie 设置为可跨子域共享（domain 为 `folionote.xyz`）。

这样浏览器访问 `web.folionote.xyz` 时也会携带同一份 session cookie，路由守卫才能读到登录态。

## 相关环境变量

```bash
# 认证服务的对外 URL（必须是 api 域名）
BETTER_AUTH_URL=https://api.folionote.xyz

# 允许前端跨域访问 api 的来源（至少包含 web 域名）
CORS_ORIGIN=https://web.folionote.xyz
```

## 开发环境切换

在开发环境，`ApiEnvironmentSettings` 切换本地 / 远程 API 后会刷新页面。`authClient` 的 `baseURL` 使用 `getServerUrl()`，登录与会话请求会跟随同一环境。

## 验证方式

1. 部署最新 server 后，在浏览器清理 `folionote.xyz` 相关 cookie（或使用无痕窗口）。
2. 在 `web.folionote.xyz` 登录。
3. 确认跳转 `/dashboard` 后不会再回到 `/login`。

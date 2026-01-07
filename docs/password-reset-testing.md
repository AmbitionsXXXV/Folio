# 密码重置流程测试指南

本文档介绍如何测试 FolioNote 的完整密码重置流程。

## 前置条件

1. 确保数据库已启动：

   ```bash
   pnpm db:start
   ```

2. 确保至少有一个测试用户账号（可通过注册页面创建）

## 测试方式

### 方式一：开发模式（无需配置 Resend）

在开发模式下，如果未配置 `RESEND_API_KEY`，密码重置链接会输出到控制台。

1. 启动服务器：

   ```bash
   pnpm dev:server
   ```

2. 启动 Web 应用：

   ```bash
   pnpm dev:web
   ```

3. 访问 <http://localhost:5173/forgot-password>

4. 输入注册时使用的邮箱地址，点击 "Send Reset Link"

5. 查看 server 终端输出，找到类似以下内容：

   ```text
   ============================================================
   [Password Reset] RESEND_API_KEY not set, logging to console
   [Password Reset] Email would be sent to: user@example.com
   [Password Reset] Reset URL: http://localhost:5173/reset-password?token=xxx
   ============================================================
   ```

6. 复制 Reset URL 并在浏览器中打开

7. 输入新密码并确认，完成密码重置

8. 使用新密码登录验证

### 方式二：使用 Resend 测试邮箱（推荐）

Resend 提供了一个默认的测试发件地址 `onboarding@resend.dev`，无需验证域名即可使用。

1. 在 [Resend](https://resend.com) 注册账号并获取 API Key

2. 配置环境变量（在 `apps/server/.env`）：

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   # 无需配置 EMAIL_FROM，默认使用 onboarding@resend.dev
   ```

3. 按照方式一的步骤 1-4 操作

4. 检查邮箱收件箱（包括垃圾邮件文件夹）

5. 点击邮件中的 "Reset Password" 按钮

6. 完成密码重置流程

> **注意**：使用 `onboarding@resend.dev` 发送的邮件只能发送到你在 Resend 注册时使用的邮箱地址。如需发送到其他邮箱，需要验证自己的域名。

### 方式三：生产模式（自定义发件地址）

如果需要使用自定义发件地址（如 `noreply@yourdomain.com`）：

1. 在 Resend 控制台添加并验证你的域名

2. 配置环境变量：

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=FolioNote <noreply@yourdomain.com>
   ```

3. 按照方式二的步骤操作

## 预览邮件模板

在开发过程中，可以预览邮件模板样式：

```bash
pnpm email:dev
```

访问 <http://localhost:3030> 查看邮件模板预览。

## 测试检查清单

### 功能测试

- [ ] 输入有效邮箱后显示成功提示
- [ ] 输入无效邮箱格式时显示错误
- [ ] 输入未注册邮箱时的行为（出于安全考虑，应显示相同的成功消息）
- [ ] 重置链接在 1 小时后过期
- [ ] 重置链接只能使用一次
- [ ] 新密码需要满足强度要求
- [ ] 密码确认需要匹配

### 邮件模板测试

- [ ] 邮件主题正确显示
- [ ] 用户名正确显示
- [ ] 重置按钮链接正确
- [ ] 备用链接文本正确
- [ ] 在不同邮件客户端中样式正常（Gmail、Outlook、Apple Mail 等）

### 安全测试

- [ ] 重置链接使用 HTTPS（生产环境）
- [ ] Token 足够随机且不可预测
- [ ] 多次请求重置不会泄露账号是否存在
- [ ] 重置成功后旧的 session 是否失效（可选）

## 常见问题

### Q: 开发模式下没有看到控制台输出？

确保 `RESEND_API_KEY` 环境变量未设置或为空。

### Q: 邮件发送失败？

1. 检查 `RESEND_API_KEY` 是否正确
2. 检查 `EMAIL_FROM` 的域名是否已在 Resend 验证
3. 查看 server 日志中的错误信息

### Q: 重置链接无效？

1. 检查链接是否已过期（1 小时）
2. 检查链接是否已被使用
3. 确保 `BETTER_AUTH_URL` 配置正确

## 相关文件

- 邮件模板：`packages/transactional/emails/reset-password.tsx`
- 主题配置：`packages/transactional/src/theme.ts`
- 认证配置：`packages/auth/src/index.ts`
- Web 页面：`apps/web/src/routes/forgot-password.tsx`、`apps/web/src/routes/reset-password.tsx`

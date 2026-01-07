# Server 部署指南

本文档介绍如何使用 GitHub Actions 自动化部署 Folio Server 到你的 VPS 服务器。

## 目录

- [架构概览](#架构概览)
- [前置要求](#前置要求)
- [服务器初始化](#服务器初始化)
- [GitHub Secrets 配置](#github-secrets-配置)
- [部署流程](#部署流程)
- [手动部署](#手动部署)
- [回滚操作](#回滚操作)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)

## 架构概览

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub Repo   │────▶│  GitHub Actions  │────▶│   VPS Server    │
│                 │     │                  │     │                 │
│  Push to main   │     │  1. Build        │     │  PM2 Process    │
│  or Manual      │     │  2. Test         │     │  Manager        │
│                 │     │  3. Deploy (SSH) │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 目录结构

服务器上的部署目录结构：

```text
/opt/folio/server/
├── current/              # 当前运行版本的符号链接
├── releases/             # 历史发布版本（保留最近 5 个）
│   ├── 20240107120000/
│   ├── 20240108150000/
│   └── ...
└── shared/               # 共享文件
    ├── .env              # 环境变量配置
    └── logs/             # 日志目录
        ├── error.log
        └── out.log
```

## 前置要求

### 服务器要求

- Ubuntu 24.04+ (推荐) 或其他 Linux 发行版
- Node.js 24+
- PM2 (全局安装)
- 至少 1GB RAM
- 开放必要端口 (默认 3000)

### 本地要求

- GitHub 仓库访问权限
- SSH 密钥对（用于服务器访问）

## 服务器初始化

首次部署前，需要在服务器上执行以下初始化步骤：

### 1. 安装 Node.js

```bash
# 使用 NodeSource 安装 Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 安装 PM2

```bash
sudo npm install -g pm2

# 设置 PM2 开机自启
pm2 startup systemd
# 按照提示执行生成的命令
```

### 3. 创建部署目录

```bash
# 创建目录结构
sudo mkdir -p /opt/folio/server/{releases,shared/logs}

# 设置权限（如果使用非 root 用户，替换为你的实际用户名）
sudo chown -R your-ssh-username:your-ssh-username /opt/folio
```

### 4. 配置环境变量

创建共享环境变量文件：

```bash
cat > /opt/folio/server/shared/.env << 'EOF'
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=your_database_url

# Auth
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=https://your-domain.com

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# 其他环境变量...
EOF

# 保护环境变量文件
chmod 600 /opt/folio/server/shared/.env
```

### 5. 配置防火墙（推荐）

```bash
# 启用防火墙（如果未启用）
sudo ufw enable

# 允许 SSH 连接（防止被锁在外面）
sudo ufw allow ssh

# 允许应用端口
sudo ufw allow 3000/tcp

# 检查防火墙状态
sudo ufw status

# 或使用 Nginx 反向代理（推荐生产环境）
sudo apt install nginx
```

### Nginx 反向代理配置（推荐）

```nginx
# /etc/nginx/sites-available/folio-server
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/folio-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## GitHub Secrets 配置

在 GitHub 仓库中配置以下 Secrets（Settings → Secrets and variables → Actions）：

| Secret 名称 | 描述 | 示例 |
| ----------- | ---- | ---- |
| `SERVER_HOST` | 服务器 IP 或域名 | `your-server-ip-or-domain` |
| `SSH_USER` | SSH 登录用户名 | `your-ssh-username` |
| `SSH_PRIVATE_KEY` | SSH 私钥（完整内容） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_URL` | 服务健康检查 URL（可选） | `http://your-server-ip:3000` |

### 生成 SSH 密钥对

如果还没有 SSH 密钥对：

```bash
# 在本地生成新的密钥对（专用于部署）
ssh-keygen -t ed25519 -C "folionote-server-deploy" -f ~/.ssh/folionote_server_deploy_key

# 将公钥添加到服务器（替换为你的实际用户名和服务器地址）
ssh-copy-id -i ~/.ssh/folionote_server_deploy_key.pub your-ssh-username@your-server-ip

# 复制私钥内容到 GitHub Secrets
cat ~/.ssh/folionote_server_deploy_key

# 重要：删除私钥文件，不要将其留在本地
rm ~/.ssh/folionote_server_deploy_key
```

## 部署流程

### 自动部署

当满足以下条件时，会自动触发部署：

1. 推送到 `main` 分支
2. 修改了以下路径的文件：
   - `apps/server/**`
   - `packages/**`
   - `.github/workflows/deploy-server.yml`

### CI/CD 流程

```text
┌─────────┐   ┌──────┐   ┌───────┐   ┌────────┐
│  Lint   │──▶│ Test │──▶│ Build │──▶│ Deploy │
└─────────┘   └──────┘   └───────┘   └────────┘
```

1. **Lint**: 代码格式检查和类型检查
2. **Test**: 运行单元测试
3. **Build**: 构建生产版本
4. **Deploy**: SSH 部署到服务器

## 手动部署

可以通过 GitHub Actions 页面手动触发部署：

1. 进入仓库的 **Actions** 页面
2. 选择 **Deploy Server** 工作流
3. 点击 **Run workflow**
4. 选择环境（production/staging）
5. 点击 **Run workflow** 按钮

## 回滚操作

如果新版本出现问题，可以快速回滚到之前的版本：

```bash
# SSH 到服务器（替换为你的实际用户名和服务器地址）
ssh your-ssh-username@your-server-ip

# 查看可用的发布版本
ls -la /opt/folio/server/releases/

# 回滚到指定版本（替换为实际的版本目录名）
ln -sfn /opt/folio/server/releases/20240107120000 /opt/folio/server/current

# 重启应用
cd /opt/folio/server/current
pm2 reload ecosystem.config.cjs --env production
```

## 监控与日志

### PM2 监控命令

```bash
# 查看应用状态
pm2 status

# 查看详细信息
pm2 show folio-server

# 实时日志
pm2 logs folio-server

# 监控面板
pm2 monit
```

### 日志位置

- **标准输出**: `/opt/folio/server/shared/logs/out.log`
- **错误日志**: `/opt/folio/server/shared/logs/error.log`

```bash
# 查看最近的日志
tail -f /opt/folio/server/shared/logs/out.log

# 查看错误日志
tail -f /opt/folio/server/shared/logs/error.log
```

### PM2 日志轮转

安装日志轮转模块：

```bash
pm2 install pm2-logrotate

# 配置（可选）
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 故障排查

### 常见问题

#### 1. SSH 连接失败

```bash
# 检查 SSH 服务状态
sudo systemctl status ssh

# 检查防火墙
sudo ufw status

# 如果显示 "Status: inactive"，需要启用防火墙
sudo ufw enable

# 测试 SSH 连接（替换为你的实际用户名和服务器地址）
ssh -v your-ssh-username@your-server-ip
```

#### 2. PM2 应用无法启动

```bash
# 查看 PM2 日志
pm2 logs folio-server --lines 100

# 检查 Node.js 版本
node --version

# 手动测试启动
cd /opt/folio/server/current
node dist/index.mjs
```

#### 3. 环境变量问题

```bash
# 检查 .env 文件是否存在且链接正确
ls -la /opt/folio/server/current/.env

# 检查环境变量内容
cat /opt/folio/server/shared/.env
```

#### 4. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000

# 或使用
sudo netstat -tulpn | grep 3000
```

#### 5. 内存不足

```bash
# 查看内存使用
free -h

# 查看 PM2 内存使用
pm2 monit
```

### 重新部署

如果需要完全重新部署：

```bash
# 停止当前应用
pm2 delete folio-server

# 清理旧版本（可选）
rm -rf /opt/folio/server/releases/*

# 通过 GitHub Actions 重新触发部署
```

## 安全建议

1. **使用专用部署密钥**: 不要使用个人 SSH 密钥
2. **限制 SSH 访问**: 考虑使用 fail2ban 或限制 IP
3. **定期更新**: 保持服务器系统和依赖包更新
4. **备份**: 定期备份环境变量和数据库
5. **监控**: 设置服务监控和告警

## 相关链接

- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Node.js 生产最佳实践](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

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
- [HTTPS 配置](#https-配置)
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

# Storage / image captioning
S3_ENDPOINT=your_supabase_s3_endpoint
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_REGION=your_s3_region
S3_PUBLIC_URL=your_supabase_public_object_base_url

IMAGE_CAPTION_INTERNAL_TOKEN=your_random_caption_token
IMAGE_CAPTION_INTERNAL_URL=https://api.your-domain.com/api/image/caption/internal
IMAGE_CAPTION_ALLOW_ENV_FALLBACK=false

# Optional platform-side AI fallback for internal caption jobs
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# 其他环境变量...
EOF

# 保护环境变量文件
chmod 600 /opt/folio/server/shared/.env
```

### 4.1 生成 `IMAGE_CAPTION_INTERNAL_TOKEN`

推荐生成一个至少 32 字节的随机 token，专门给内部图片描述接口使用。

```bash
openssl rand -hex 32
```

或：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

把输出结果写入：

```env
IMAGE_CAPTION_INTERNAL_TOKEN=这里替换成随机 token
```

### 4.2 这几个图片描述相关环境变量分别做什么

| 变量 | 作用 | 是否推荐生产显式配置 |
| --- | --- | --- |
| `IMAGE_CAPTION_INTERNAL_TOKEN` | 保护 `POST /api/image/caption/internal`，防止伪造内部调用 | 是 |
| `IMAGE_CAPTION_INTERNAL_URL` | 指定服务端上传后异步触发图片描述时，要请求的完整内部地址 | 是 |
| `IMAGE_CAPTION_ALLOW_ENV_FALLBACK` | 是否允许内部图片描述流程在无用户 BYOK 时使用平台侧 AI key | 是，默认建议 `false` |

如果你使用的是单机单进程部署，且应用就监听在本机端口，也可以不配 `IMAGE_CAPTION_INTERNAL_URL`，让代码自动回退到：

```text
http://127.0.0.1:${PORT}/api/image/caption/internal
```

但在下面这些场景里，建议一定显式配置：

1. Docker / 容器编排
2. 反向代理或网关转发
3. 多实例部署
4. 应用实际监听地址不等于 `127.0.0.1:${PORT}`

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
| --- | --- | --- |
| `SERVER_HOST` | 服务器 IP 或域名 | `your-server-ip-or-domain` |
| `SSH_USER` | SSH 登录用户名 | `your-ssh-username` |
| `SSH_PRIVATE_KEY` | SSH 私钥（完整内容） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_URL` | 服务健康检查 URL（可选） | `http://your-server-ip:3000` |
| `SERVER_DOMAIN` | Caddy 反向代理域名（可选） | `api.your-domain.com` |

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

## HTTPS 配置

当您注册域名后，需要配置 HTTPS 以确保通信安全。以下提供三种主流方案供选择：

| 方案 | 优点 | 缺点 | 推荐场景 |
| --- | --- | --- | --- |
| **Nginx + Certbot** | 功能强大、生态成熟、文档丰富 | 配置相对复杂 | 需要精细控制、已有 Nginx 经验 |
| **Caddy** | 自动 HTTPS、配置极简、零配置证书 | 生态相对较小 | 快速部署、追求简洁 |
| **Cloudflare** | CDN 加速、DDoS 防护、无需服务器配置 | 需要更改 DNS | 需要 CDN、全球加速 |

### 方案一：Nginx + Certbot（Let's Encrypt）

这是最传统且功能最强大的方案，适合需要精细控制的场景。

#### 1. 安装 Certbot

```bash
# 安装 Certbot 和 Nginx 插件
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

#### 2. 配置 Nginx（HTTP）

首先配置基础的 HTTP 反向代理：

```bash
# 创建 Nginx 配置文件
sudo nano /etc/nginx/sites-available/folio-server
```

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

        # WebSocket 支持（如需要）
        proxy_read_timeout 86400;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/folio-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 申请 SSL 证书

```bash
# 自动申请证书并配置 Nginx
sudo certbot --nginx -d api.your-domain.com

# 按提示操作：
# 1. 输入邮箱地址（用于证书到期提醒）
# 2. 同意服务条款
# 3. 选择是否将 HTTP 重定向到 HTTPS（推荐选择 2）
```

Certbot 会自动：

- 申请 Let's Encrypt 证书
- 修改 Nginx 配置添加 SSL 设置
- 设置 HTTP 到 HTTPS 的重定向

#### 4. 验证自动续期

```bash
# 测试续期（不会真正续期）
sudo certbot renew --dry-run

# 查看证书状态
sudo certbot certificates
```

Certbot 会自动创建 cron job 或 systemd timer 来续期证书。

#### 5. 最终的 Nginx 配置（Certbot 自动生成）

```nginx
# /etc/nginx/sites-available/folio-server（Certbot 修改后）
server {
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
        proxy_read_timeout 86400;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = api.your-domain.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name api.your-domain.com;
    return 404;
}
```

#### 6. 防火墙配置

```bash
# 允许 HTTPS 流量
sudo ufw allow 'Nginx Full'

# 或单独允许
sudo ufw allow 443/tcp

# 如果不再需要直接访问 3000 端口，可以关闭
sudo ufw delete allow 3000/tcp
```

---

### 方案二：Caddy（推荐简洁方案）

Caddy 是一个现代化的 Web 服务器，最大特点是 **自动 HTTPS**——无需任何配置即可自动申请和续期证书。

> **🎉 自动化部署**
>
> 本项目已将 Caddy 配置集成到代码仓库中（`apps/server/Caddyfile`），通过 GitHub Actions 自动部署。
>
> **你只需要：**
>
> 1. 在 GitHub Secrets 中配置 `SERVER_DOMAIN`（例如 `api.your-domain.com`）
> 2. 推送代码到 `main` 分支
>
> 部署脚本会自动：
>
> - 检测并安装 Caddy（如果服务器上没有）
> - 复制 Caddyfile 到 `/etc/caddy/Caddyfile`
> - 重载 Caddy 配置
> - Caddy 自动申请 HTTPS 证书

#### 手动安装 Caddy（可选）

如果需要手动安装 Caddy：

```bash
# 添加 Caddy 官方仓库
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

# 安装 Caddy
sudo apt update
sudo apt install caddy
```

#### Caddyfile 配置说明

项目中的 `apps/server/Caddyfile` 包含以下配置：

```text
# apps/server/Caddyfile
{$DOMAIN:localhost} {
    reverse_proxy localhost:3000 {
        health_uri /health
        health_interval 30s
    }

    encode gzip zstd

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    log {
        output file /var/log/caddy/folio-server.log
        format json
    }
}
```

部署时，`{$DOMAIN:localhost}` 会被替换为 GitHub Secrets 中配置的 `SERVER_DOMAIN`。

#### 启动 Caddy

```bash
# 重新加载配置
sudo systemctl reload caddy

# 或重启服务
sudo systemctl restart caddy

# 查看状态
sudo systemctl status caddy

# 设置开机自启（通常已默认启用）
sudo systemctl enable caddy
```

**就这样！** Caddy 会自动：

- 申请 Let's Encrypt 证书
- 配置 HTTPS
- 设置 HTTP 到 HTTPS 的重定向
- 自动续期证书

#### 4. 防火墙配置

```bash
# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 如果不需要直接访问应用端口
sudo ufw delete allow 3000/tcp
```

#### 5. 多域名配置示例

如果需要同时配置 API 和前端：

```text
# /etc/caddy/Caddyfile

# API 服务
api.your-domain.com {
    reverse_proxy localhost:3000
    encode gzip
}

# 前端服务（如果有）
your-domain.com {
    reverse_proxy localhost:3001
    encode gzip
}

# 或者静态文件服务
www.your-domain.com {
    root * /var/www/frontend
    file_server
    encode gzip

    # SPA 支持
    try_files {path} /index.html
}
```

#### 6. Caddy 常用命令

```bash
# 验证配置文件
caddy validate --config /etc/caddy/Caddyfile

# 格式化配置文件
caddy fmt --overwrite /etc/caddy/Caddyfile

# 查看证书状态
caddy list-modules

# 查看日志
sudo journalctl -u caddy -f
```

---

### 方案三：Cloudflare（CDN + SSL）

使用 Cloudflare 可以获得免费的 CDN、DDoS 防护和 SSL，适合需要全球加速的场景。

#### 1. 添加域名到 Cloudflare

1. 注册 [Cloudflare](https://cloudflare.com) 账号
2. 添加您的域名
3. 按照指引更改域名的 NS 记录指向 Cloudflare

#### 2. 配置 DNS 记录

在 Cloudflare 面板中添加 DNS 记录：

| 类型 | 名称 | 内容          | 代理状态           |
| ---- | ---- | ------------- | ------------------ |
| A    | api  | 你的服务器 IP | 已代理（橙色云朵） |

#### 3. 配置 SSL/TLS

在 Cloudflare 面板中：

1. 进入 **SSL/TLS** → **概述**
2. 选择加密模式：
   - **灵活（Flexible）**：Cloudflare 到服务器使用 HTTP（最简单，但不推荐）
   - **完全（Full）**：服务器需要有 SSL 证书（可以是自签名）
   - **完全（严格）（Full Strict）**：服务器需要有效的 SSL 证书（推荐）

#### 4. 服务器配置（完全严格模式）

如果选择"完全（严格）"模式，需要在服务器上配置 Cloudflare 的 Origin 证书：

```bash
# 在 Cloudflare 面板创建 Origin 证书：
# SSL/TLS → Origin Server → Create Certificate

# 将证书保存到服务器
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/cert.pem  # 粘贴证书内容
sudo nano /etc/ssl/cloudflare/key.pem   # 粘贴私钥内容

# 设置权限
sudo chmod 600 /etc/ssl/cloudflare/key.pem
```

**使用 Nginx 配置：**

```nginx
# /etc/nginx/sites-available/folio-server
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    # Cloudflare 推荐的 SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$host$request_uri;
}
```

**使用 Caddy 配置：**

```text
# /etc/caddy/Caddyfile
api.your-domain.com {
    tls /etc/ssl/cloudflare/cert.pem /etc/ssl/cloudflare/key.pem

    reverse_proxy localhost:3000 {
        header_up X-Real-IP {http.request.header.CF-Connecting-IP}
    }

    encode gzip
}
```

#### 5. 配置安全选项（推荐）

在 Cloudflare 面板中配置：

- **SSL/TLS → Edge Certificates**
  - Always Use HTTPS: 开启
  - Automatic HTTPS Rewrites: 开启
  - Minimum TLS Version: TLS 1.2

- **Security → Settings**
  - Security Level: Medium 或 High
  - Challenge Passage: 30 minutes

- **Speed → Optimization**
  - Auto Minify: 根据需要开启
  - Brotli: 开启

#### 6. 获取真实客户端 IP

Cloudflare 代理会改变客户端 IP，需要配置获取真实 IP：

**Nginx 配置：**

```bash
# 创建 Cloudflare IP 配置
sudo nano /etc/nginx/conf.d/cloudflare.conf
```

```nginx
# /etc/nginx/conf.d/cloudflare.conf
# Cloudflare IPv4
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;

# Cloudflare IPv6
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

real_ip_header CF-Connecting-IP;
```

---

### 方案对比与选择建议

#### 快速决策

- **最简单**：选择 **Caddy**
- **最强大**：选择 **Nginx + Certbot**
- **需要 CDN**：选择 **Cloudflare**

#### 详细对比

| 特性           | Nginx + Certbot | Caddy        | Cloudflare   |
| -------------- | --------------- | ------------ | ------------ |
| 配置复杂度     | 中等            | 极低         | 低           |
| 自动证书管理   | 需要配置        | 自动         | 自动         |
| 性能           | 最高            | 高           | 高（有 CDN） |
| 内存占用       | 低              | 低           | N/A          |
| WebSocket 支持 | 需要配置        | 自动         | 支持         |
| 负载均衡       | 支持            | 支持         | 支持         |
| CDN/缓存       | 需要额外配置    | 需要额外配置 | 内置         |
| DDoS 防护      | 需要额外方案    | 需要额外方案 | 内置         |
| 学习曲线       | 陡峭            | 平缓         | 平缓         |

#### 混合方案

也可以组合使用，例如：

- **Cloudflare + Caddy**：在 Cloudflare 后面使用 Caddy 作为源服务器
- **Cloudflare + Nginx**：利用 Cloudflare 的 CDN 和 Nginx 的灵活性

### 更新环境变量

配置 HTTPS 后，记得更新相关环境变量：

```bash
# 编辑环境变量
nano /opt/folio/server/shared/.env
```

```bash
# 更新为 HTTPS URL
BETTER_AUTH_URL=https://api.your-domain.com
CORS_ORIGIN=https://your-frontend-domain.com
```

```bash
# 重启应用使配置生效
pm2 reload folio-server
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

如果在 GitHub Actions 构建 Web 端时遇到 OOM，优先从构建配置优化：

```text
1. 在 vite 配置中过滤第三方包的 "use client" 噪声告警（MODULE_LEVEL_DIRECTIVE）
2. 仅对 client build 应用 manualChunks，避免 SSR 构建阶段额外分块开销
3. 关闭 build.reportCompressedSize，减少构建期额外统计开销
```

验证命令：

```bash
pnpm -C apps/web build
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
- [Let's Encrypt 官网](https://letsencrypt.org/)
- [Certbot 官方文档](https://certbot.eff.org/)
- [Caddy 官方文档](https://caddyserver.com/docs/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Cloudflare SSL/TLS 文档](https://developers.cloudflare.com/ssl/)

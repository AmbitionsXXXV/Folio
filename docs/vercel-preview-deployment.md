# Vercel Preview Deployment

## 问题背景

`apps/web` 使用的是 **TanStack Start + Nitro**。  
默认执行 `vite build` 时，普通 Node 预设会产出：

- `.output/server`
- `.output/public`

但 Vercel 在自动识别为 Vite 项目时，会默认期待静态产物目录 `dist`。  
这会导致 Preview Deployment 在构建完成后报错：

```text
No Output Directory named "dist" found after the Build completed.
```

## 解决方案

不要把 Vercel 当成普通静态 Vite 站点来处理，而是让 Nitro 直接输出 **Vercel Build Output API** 所需结构。

核心做法：

```bash
NITRO_PRESET=vercel pnpm run build
```

这样会生成：

```text
.vercel/output/
├── config.json
├── functions/
└── static/
```

Vercel 会直接读取这套产物，而不再依赖 `dist`。

## 仓库内配置

### 1. 仓库根目录 `vercel.json`

适用于 **Vercel Project Root Directory 指向仓库根目录** 的情况。

根配置会：

1. 在 `apps/web` 内执行 `NITRO_PRESET=vercel` 构建
2. 将 `apps/web/.vercel/output` 复制到仓库根的 `.vercel/output`

### 2. `apps/web/vercel.json`

适用于 **Vercel Project Root Directory 指向 `apps/web`** 的情况。

此时直接在 `apps/web` 内执行：

```bash
NITRO_PRESET=vercel pnpm run build
```

生成的 `.vercel/output` 就已经位于项目根目录，可被 Vercel 直接消费。

## Vercel Project Settings 建议

### 方案 A：Project Root = 仓库根目录

- Root Directory：仓库根目录
- 不要再配置 `Output Directory=dist`
- 保持仓库根 `vercel.json` 生效

### 方案 B：Project Root = `apps/web`

- Root Directory：`apps/web`
- 不要再配置 `Output Directory=dist`
- 保持 `apps/web/vercel.json` 生效

## 本地验证

以下命令已验证可生成 Vercel 产物：

```bash
cd apps/web
rm -rf .vercel .output
NITRO_PRESET=vercel pnpm run build
```

构建完成后应可看到：

```text
.vercel/output/config.json
.vercel/output/functions
.vercel/output/static
```

如果你的 Vercel 仍然报 `dist` 缺失，通常说明：

1. Project Settings 里仍手动配置了 `Output Directory=dist`
2. Vercel 没有读取到正确的 `vercel.json`
3. Root Directory 与你实际生效的 `vercel.json` 不一致

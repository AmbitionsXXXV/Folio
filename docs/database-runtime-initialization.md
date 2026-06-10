# 数据库运行时初始化与打包说明

## 背景

- web 端 SSR 打包产物在运行时可能出现 `ReferenceError: Cannot access 'pg' before initialization`，属于 `pg` 被打包进 ESM 产物后触发的初始化顺序问题。
- server 端部署采用零依赖包（只上传 `apps/server/dist` 与少量配置文件），运行时没有 `node_modules`，因此不能依赖 `require('drizzle-orm/node-postgres')` 这类运行时解析。

## 当前实现

### web（TanStack Start + Nitro）

`apps/web/vite.config.ts` 将 **仅** `@folionote/db` 的根导入重定向到 `packages/db/src/index.lazy.ts`：

```ts
// apps/web/vite.config.ts
resolve: {
  alias: [
    {
      find: /^@folionote\/db$/,
      replacement: ".../packages/db/src/index.lazy.ts",
    },
  ],
}
```

`packages/db/src/index.lazy.ts` 使用 `createRequire` 与 Proxy 做延迟初始化，从而让 `drizzle-orm/node-postgres` 在运行时由 Node 解析（避免被 SSR 打包器处理进 bundle）。

### server（tsdown 零依赖 bundle）

server 构建使用 `apps/server/tsdown.config.ts` 的 `noExternal: [/.*/]` 将依赖打入 `apps/server/dist/index.mjs`。

server 运行时使用 `@folionote/db` 的默认入口 `packages/db/src/index.ts`（静态 `import { drizzle } from 'drizzle-orm/node-postgres'`），以保证部署包不依赖 `node_modules`。

## 注意事项

1. server 部署包默认不包含 `node_modules`，运行时出现 `Cannot find module 'drizzle-orm/node-postgres'` 通常意味着该依赖被保留成了运行时解析。
2. web 端的 `@folionote/db` alias 只作用于 web 构建流程，不会影响 server 的 `tsdown` 产物。

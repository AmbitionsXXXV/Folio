# Web 端 TanStack Devtools 与 Hotkeys 迁移

本文记录 Web 端从分离式 Devtools 与自定义 hotkey 方案迁移到 TanStack 官方方案后的约定。

## Devtools 约定

1. 统一使用 `@tanstack/react-devtools` 挂载一个 `TanStackDevtools` 面板。
2. 通过 `plugins` 注入 `ReactQueryDevtoolsPanel` 与 `TanStackRouterDevtoolsPanel`。
3. `vite` 配置中将 `devtools()` 放在插件数组首位。
4. 不再在根路由里分别挂载独立的 `ReactQueryDevtools` 与 `TanStackRouterDevtools` 组件。

## Hotkeys 约定

1. 统一使用 `@tanstack/react-hotkeys` 的 `useHotkey`。
2. 不再使用自定义 `use-hotkey.ts` 与 `parse-hotkey.ts`。
3. 当前全局快捷键如下：
   - `Mod+K`：打开/关闭命令面板
   - `Mod+B`：切换侧边栏
   - `Mod+S`：在新建条目页面执行保存（仅当标题或正文非空）

## 参考

- TanStack Devtools Quick Start：<https://tanstack.com/devtools/latest/docs/quick-start>
- TanStack Hotkeys Installation：<https://tanstack.com/hotkeys/latest/docs/installation>

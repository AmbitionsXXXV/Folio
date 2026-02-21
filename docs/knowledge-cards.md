# 知识卡片 UI 规范

本文件记录 `StockCard` 与 `WeatherCard` 的 lint 约束。

- `StockCard` 的趋势图标需要包含 `title`，为 SVG 提供可访问的替代文本。
- `WeatherCard` 的动画元素需要使用稳定的 key，避免数组索引作为 key。
- `StockCard` 与 `WeatherCard` 从 `@folionote/ai-tools` 引用时，`apps/web/src/index.css` 需要包含 `@source "../../../packages/ai-tools/src/**/*.{ts,tsx}"`，确保 Tailwind 工具类与动画样式生效。

import { defineConfig } from "vite-plus"

export default defineConfig({
  // `vp pack` wraps tsdown; options mirror the former tsdown.config.ts.
  pack: {
    entry: "./src/index.ts",
    format: "esm",
    outDir: "./dist",
    clean: true,
    // App build (run via `node dist/index.mjs`), not a published library —
    // no consumer imports its types, so skip declaration output. vp pack
    // enables dts by default, unlike the former tsdown config.
    dts: false,
    // Bundle all dependencies into the output (zero-dependency deployment)
    noExternal: [/.*/],
    inlineOnly: false,
    // Exclude Node.js built-in modules and native modules that can't be bundled
    external: [/^node:/, "fsevents"]
  }
})

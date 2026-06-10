import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineProject } from "vite-plus/test/config"

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: [
      {
        // Mirror apps/web tsconfig `@/*` -> `src/*` for tests
        find: /^@\//u,
        replacement: `${fileURLToPath(new URL("src", import.meta.url))}/`
      }
    ]
  },
  test: {
    name: "web",
    globals: true,
    environment: "jsdom",
    include: ["**/__tests__/**/*.test.tsx", "**/*.spec.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./__tests__/setup.ts"],
    deps: {
      optimizer: {
        web: {
          // Transform CJS React for jsdom
          include: [
            "react",
            "react-dom",
            "react/jsx-runtime",
            "react/jsx-dev-runtime"
          ]
        }
      }
    },
    server: {
      deps: {
        // Inline problematic ESM/CJS mixed packages
        inline: [
          /nitro/,
          /@tanstack/,
          /react-i18next/,
          /i18next/,
          /streamdown/,
          /@streamdown/
        ]
      }
    }
  }
})

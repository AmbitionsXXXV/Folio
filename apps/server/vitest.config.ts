import { defineProject } from "vite-plus/test/config"

export default defineProject({
  test: {
    name: "server",
    globals: true,
    environment: "node",
    testTimeout: 30_000,
    include: ["__tests__/**/*.test.ts", "**/*.spec.ts"],
    // Exclude integration tests (they need a running database)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
      "__tests__/integration/**"
    ]
    // No setupFiles for unit tests - they use memory stores
  }
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 30_000,
		include: ['__tests__/**/*.test.ts', '**/*.spec.ts'],
		exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
		setupFiles: ['__tests__/setup.ts'],
	},
})

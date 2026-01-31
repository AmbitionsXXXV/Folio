import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		name: 'web',
		globals: true,
		environment: 'jsdom',
		include: ['**/__tests__/**/*.test.tsx', '**/*.spec.tsx'],
		exclude: ['**/node_modules/**', '**/dist/**'],
		setupFiles: ['./__tests__/setup.ts'],
		deps: {
			optimizer: {
				web: {
					// Transform CJS React for jsdom
					include: [
						'react',
						'react-dom',
						'react/jsx-runtime',
						'react/jsx-dev-runtime',
					],
				},
			},
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
					/@streamdown/,
				],
			},
		},
	},
})

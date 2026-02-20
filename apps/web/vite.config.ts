import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [
		devtools(),
		tsconfigPaths(),
		tailwindcss(),
		tanstackStart(),
		nitro(),
		viteReact(),
	],
	resolve: {
		alias: [
			{
				find: /^@folionote\/db$/,
				replacement: fileURLToPath(
					new URL('../../packages/db/src/index.lazy.ts', import.meta.url)
				),
			},
		],
	},
	server: {
		port: 3001,
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					// React core
					if (
						id.includes('node_modules/react/') ||
						id.includes('node_modules/react-dom/')
					) {
						return 'react-vendor'
					}
					// TanStack Router
					if (id.includes('node_modules/@tanstack/react-router')) {
						return 'tanstack-router'
					}
					// TanStack Query
					if (id.includes('node_modules/@tanstack/react-query')) {
						return 'tanstack-query'
					}
					// Tiptap editor
					if (
						id.includes('node_modules/@tiptap/') ||
						id.includes('node_modules/prosemirror-')
					) {
						return 'tiptap'
					}
					// Shiki (syntax highlighting)
					if (
						id.includes('node_modules/shiki') ||
						id.includes('node_modules/@shikijs')
					) {
						return 'shiki'
					}
					// Tippy.js
					if (
						id.includes('node_modules/tippy.js') ||
						id.includes('node_modules/@popperjs')
					) {
						return 'tippy'
					}
					// Motion
					if (id.includes('node_modules/motion')) {
						return 'motion'
					}
				},
			},
		},
	},
})

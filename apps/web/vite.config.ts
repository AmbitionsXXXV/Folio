import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const SHIKIJS_RE = /^@shikijs\//
const FOLIONOTE_DB_RE = /^@folionote\/db$/

const shouldIgnoreUseClientDirectiveWarning = (message: string) => {
	return (
		message.includes('Module level directives cause errors when bundled') &&
		message.includes('"use client"')
	)
}

const CHUNK_RULES: Array<{ test: (id: string) => boolean; chunk: string }> = [
	{
		test: (id) =>
			id.includes('node_modules/react/') || id.includes('node_modules/react-dom/'),
		chunk: 'react-vendor',
	},
	{
		test: (id) => id.includes('node_modules/@tanstack/react-router'),
		chunk: 'tanstack-router',
	},
	{
		test: (id) => id.includes('node_modules/@tanstack/react-query'),
		chunk: 'tanstack-query',
	},
	{
		test: (id) =>
			id.includes('node_modules/@tiptap/') ||
			id.includes('node_modules/prosemirror-'),
		chunk: 'tiptap',
	},
	{
		test: (id) =>
			id.includes('node_modules/shiki') || id.includes('node_modules/@shikijs'),
		chunk: 'shiki',
	},
	{
		test: (id) =>
			id.includes('node_modules/tippy.js') || id.includes('node_modules/@popperjs'),
		chunk: 'tippy',
	},
	{ test: (id) => id.includes('node_modules/motion'), chunk: 'motion' },
]

function resolveManualChunk(id: string): string | undefined {
	for (const rule of CHUNK_RULES) {
		if (rule.test(id)) return rule.chunk
	}
	return undefined
}

export default defineConfig(({ command, isSsrBuild }) => ({
	plugins: [
		...(command === 'serve' ? [devtools()] : []),
		tailwindcss(),
		tanstackStart(),
		nitro({
			rollupConfig: {
				external: [
					'@base-ui/react',
					'@base-ui/utils',
					'motion',
					'shiki',
					'mermaid',
					'cytoscape',
					'cytoscape-fcose',
					'recharts',
					SHIKIJS_RE,
				],
				onwarn(warning, warn) {
					if (shouldIgnoreUseClientDirectiveWarning(warning.message)) {
						return
					}
					warn(warning)
				},
			},
		}),
		viteReact(),
	],
	resolve: {
		tsconfigPaths: true,
		alias: [
			{
				find: FOLIONOTE_DB_RE,
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
		reportCompressedSize: false,
		rollupOptions: {
			onwarn(warning, warn) {
				if (shouldIgnoreUseClientDirectiveWarning(warning.message)) {
					return
				}
				warn(warning)
			},
			output: isSsrBuild ? undefined : { manualChunks: resolveManualChunk },
		},
	},
}))

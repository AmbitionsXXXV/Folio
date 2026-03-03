import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: './src/index.ts',
	format: 'esm',
	outDir: './dist',
	clean: true,
	// Bundle all dependencies into the output (zero-dependency deployment)
	noExternal: [/.*/],
	inlineOnly: false,
	// Exclude Node.js built-in modules
	external: [
		/^node:/,
		// Native modules that can't be bundled
		'fsevents',
	],
})

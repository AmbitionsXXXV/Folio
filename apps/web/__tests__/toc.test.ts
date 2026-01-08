import { describe, expect, it } from 'vitest'
import { parseTocFromContent, slugifyHeading } from '../src/lib/toc'

describe('TOC utilities', () => {
	describe('slugifyHeading', () => {
		it('converts text to lowercase kebab-case', () => {
			expect(slugifyHeading('Hello World')).toBe('hello-world')
		})

		it('handles multiple spaces', () => {
			expect(slugifyHeading('Hello   World')).toBe('hello-world')
		})

		it('removes special characters', () => {
			expect(slugifyHeading('Hello, World!')).toBe('hello-world')
		})

		it('handles Unicode characters', () => {
			expect(slugifyHeading('你好世界')).toBe('你好世界')
			expect(slugifyHeading('こんにちは')).toBe('こんにちは')
		})

		it('handles mixed Unicode and ASCII', () => {
			expect(slugifyHeading('Hello 你好')).toBe('hello-你好')
		})

		it('trims whitespace', () => {
			expect(slugifyHeading('  Hello  ')).toBe('hello')
		})

		it('handles empty string', () => {
			expect(slugifyHeading('')).toBe('')
		})

		it('removes leading and trailing hyphens', () => {
			expect(slugifyHeading('- Hello -')).toBe('hello')
		})
	})

	describe('parseTocFromContent', () => {
		it('extracts H1-H3 headings from ProseMirror JSON', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Introduction' }],
					},
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Some text' }],
					},
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [{ type: 'text', text: 'Getting Started' }],
					},
					{
						type: 'heading',
						attrs: { level: 3 },
						content: [{ type: 'text', text: 'Installation' }],
					},
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(3)
			expect(items[0]).toEqual({
				title: 'Introduction',
				depth: 1,
				url: '#introduction',
			})
			expect(items[1]).toEqual({
				title: 'Getting Started',
				depth: 2,
				url: '#getting-started',
			})
			expect(items[2]).toEqual({
				title: 'Installation',
				depth: 3,
				url: '#installation',
			})
		})

		it('ignores H4+ headings', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 4 },
						content: [{ type: 'text', text: 'Too Deep' }],
					},
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Valid' }],
					},
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(1)
			expect(items[0]?.title).toBe('Valid')
		})

		it('handles empty content', () => {
			expect(parseTocFromContent('')).toEqual([])
			expect(parseTocFromContent(null)).toEqual([])
			expect(parseTocFromContent(undefined)).toEqual([])
		})

		it('handles invalid JSON gracefully', () => {
			expect(parseTocFromContent('not valid json')).toEqual([])
		})

		it('handles document without content array', () => {
			expect(parseTocFromContent('{}')).toEqual([])
			expect(parseTocFromContent('{"type": "doc"}')).toEqual([])
		})

		it('skips headings without text', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [],
					},
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [{ type: 'text', text: 'Has Text' }],
					},
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(1)
			expect(items[0]?.title).toBe('Has Text')
		})

		it('extracts text from nested content', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [
							{ type: 'text', text: 'Hello ' },
							{
								type: 'bold',
								content: [{ type: 'text', text: 'World' }],
							},
						],
					},
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(1)
			expect(items[0]?.title).toBe('Hello World')
		})

		it('accepts object input directly', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Direct Object' }],
					},
				],
			}

			const items = parseTocFromContent(json)

			expect(items).toHaveLength(1)
			expect(items[0]?.title).toBe('Direct Object')
		})

		it('handles duplicate headings with unique URLs', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Setup' }],
					},
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [{ type: 'text', text: 'Setup' }],
					},
					{
						type: 'heading',
						attrs: { level: 3 },
						content: [{ type: 'text', text: 'Setup' }],
					},
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(3)
			expect(items[0]?.url).toBe('#setup')
			expect(items[1]?.url).toBe('#setup-1')
			expect(items[2]?.url).toBe('#setup-2')
		})

		it('handles items with empty slug by using fallback', () => {
			const json = {
				type: 'doc',
				content: [
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: '...' }],
					},
					{
						type: 'heading',
						attrs: { level: 2 },
						content: [{ type: 'text', text: '!!!' }],
					},
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(2)
			expect(items[0]?.url).toBe('#heading')
			expect(items[1]?.url).toBe('#heading-1')
		})

		it('returns empty array for invalid input', () => {
			expect(parseTocFromContent(null)).toEqual([])
			expect(parseTocFromContent('')).toEqual([])
		})
	})
})

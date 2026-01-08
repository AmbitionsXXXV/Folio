import { describe, expect, it } from 'vitest'
import {
	extractTocItemsFromContentJson,
	makeUniqueHeadingIds,
	parseTocFromContent,
	slugifyHeading,
} from '../src/lib/toc'

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

	describe('extractTocItemsFromContentJson', () => {
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

			const items = extractTocItemsFromContentJson(JSON.stringify(json))

			expect(items).toHaveLength(3)
			expect(items[0]).toEqual({
				id: 'introduction',
				title: 'Introduction',
				level: 1,
				url: '#introduction',
			})
			expect(items[1]).toEqual({
				id: 'getting-started',
				title: 'Getting Started',
				level: 2,
				url: '#getting-started',
			})
			expect(items[2]).toEqual({
				id: 'installation',
				title: 'Installation',
				level: 3,
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

			const items = extractTocItemsFromContentJson(JSON.stringify(json))

			expect(items).toHaveLength(1)
			expect(items[0].title).toBe('Valid')
		})

		it('handles empty content', () => {
			expect(extractTocItemsFromContentJson('')).toEqual([])
			expect(extractTocItemsFromContentJson(null)).toEqual([])
			expect(extractTocItemsFromContentJson(undefined)).toEqual([])
		})

		it('handles invalid JSON gracefully', () => {
			expect(extractTocItemsFromContentJson('not valid json')).toEqual([])
		})

		it('handles document without content array', () => {
			expect(extractTocItemsFromContentJson('{}')).toEqual([])
			expect(extractTocItemsFromContentJson('{"type": "doc"}')).toEqual([])
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

			const items = extractTocItemsFromContentJson(JSON.stringify(json))

			expect(items).toHaveLength(1)
			expect(items[0].title).toBe('Has Text')
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

			const items = extractTocItemsFromContentJson(JSON.stringify(json))

			expect(items).toHaveLength(1)
			expect(items[0].title).toBe('Hello World')
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

			const items = extractTocItemsFromContentJson(json)

			expect(items).toHaveLength(1)
			expect(items[0].title).toBe('Direct Object')
		})
	})

	describe('makeUniqueHeadingIds', () => {
		it('keeps unique IDs unchanged', () => {
			const items = [
				{ id: 'intro', title: 'Intro', level: 1, url: '#intro' },
				{ id: 'setup', title: 'Setup', level: 2, url: '#setup' },
			]

			const result = makeUniqueHeadingIds(items)

			expect(result[0].id).toBe('intro')
			expect(result[1].id).toBe('setup')
		})

		it('appends numeric suffix for duplicates', () => {
			const items = [
				{ id: 'intro', title: 'Intro', level: 1, url: '#intro' },
				{ id: 'intro', title: 'Intro', level: 2, url: '#intro' },
				{ id: 'intro', title: 'Intro', level: 3, url: '#intro' },
			]

			const result = makeUniqueHeadingIds(items)

			expect(result[0].id).toBe('intro')
			expect(result[0].url).toBe('#intro')
			expect(result[1].id).toBe('intro-1')
			expect(result[1].url).toBe('#intro-1')
			expect(result[2].id).toBe('intro-2')
			expect(result[2].url).toBe('#intro-2')
		})

		it('handles empty array', () => {
			expect(makeUniqueHeadingIds([])).toEqual([])
		})

		it('handles items with empty id', () => {
			const items = [
				{ id: '', title: 'No ID', level: 1, url: '#' },
				{ id: '', title: 'No ID 2', level: 2, url: '#' },
			]

			const result = makeUniqueHeadingIds(items)

			expect(result[0].id).toBe('heading')
			expect(result[1].id).toBe('heading-1')
		})
	})

	describe('parseTocFromContent', () => {
		it('combines extraction and deduplication', () => {
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
				],
			}

			const items = parseTocFromContent(JSON.stringify(json))

			expect(items).toHaveLength(2)
			// parseTocFromContent now returns TOCItemType format (url instead of id)
			expect(items[0].url).toBe('#setup')
			expect(items[1].url).toBe('#setup-1')
		})

		it('returns empty array for invalid input', () => {
			expect(parseTocFromContent(null)).toEqual([])
			expect(parseTocFromContent('')).toEqual([])
		})
	})
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockLookup = vi.hoisted(() => vi.fn())

vi.mock('node:dns/promises', () => ({
	lookup: mockLookup,
}))

import { fetchUrlContent } from '../src/web-fetch/api/fetch-url'

describe('fetchUrlContent', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.unstubAllGlobals()
		mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
	})

	it('rejects loopback IP addresses before issuing a request', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchUrlContent('http://127.0.0.1/private')).rejects.toThrow(
			'URL resolves to a private, loopback, or otherwise non-public address'
		)

		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('rejects single-label internal hostnames', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchUrlContent('http://redis/admin')).rejects.toThrow(
			'URL resolves to a private, loopback, or otherwise non-public address'
		)

		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('rejects hostnames that resolve to private IP space', async () => {
		mockLookup.mockResolvedValue([{ address: '10.0.12.8', family: 4 }])
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchUrlContent('https://internal.example.com')).rejects.toThrow(
			'URL resolves to a private, loopback, or otherwise non-public address'
		)

		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('rejects redirect targets that jump into private networks', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				Response.redirect('http://169.254.169.254/latest/meta-data', 302)
			)

		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchUrlContent('https://example.com/redirect')).rejects.toThrow(
			'URL resolves to a private, loopback, or otherwise non-public address'
		)

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('follows safe redirects and returns formatted content', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: '/docs/page' },
				})
			)
			.mockResolvedValueOnce(
				new Response('<html><body><h1>Hello</h1><p>World</p></body></html>', {
					status: 200,
					headers: { 'content-type': 'text/html; charset=utf-8' },
				})
			)

		vi.stubGlobal('fetch', fetchMock)

		const result = await fetchUrlContent('https://example.com/start', 'text')

		expect(result.url).toBe('https://example.com/start')
		expect(result.format).toBe('text')
		expect(result.contentType).toContain('text/html')
		expect(result.content).toContain('Hello')
		expect(result.content).toContain('World')
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('rejects URLs with embedded credentials', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		await expect(fetchUrlContent('https://user:pass@example.com')).rejects.toThrow(
			'URL must not include embedded credentials'
		)

		expect(fetchMock).not.toHaveBeenCalled()
	})
})

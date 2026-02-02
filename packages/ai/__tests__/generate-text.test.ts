/**
 * Tests for generateTextWithCredential using AI SDK mock providers
 *
 * Based on AI SDK v6 testing documentation:
 * https://ai-sdk.dev/docs/ai-sdk-core/testing
 *
 * Uses MockLanguageModelV3 to provide deterministic, repeatable tests
 * without calling actual LLM providers.
 */

import { generateText } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it, vi } from 'vitest'
import {
	createMockDoGenerateResponse,
	createMockOpenAICredential,
	TEST_PROMPTS,
	TEST_RESPONSES,
} from './mock-helpers'

// Mock the vercel-ai module to inject MockLanguageModelV3
vi.mock('../src/vercel-ai', () => ({
	createVercelAiChatModel: vi.fn(),
}))

import { generateTextWithCredential } from '../src/generate-text'
import { createVercelAiChatModel } from '../src/vercel-ai'

const mockedCreateVercelAiChatModel = vi.mocked(createVercelAiChatModel)

describe('generateTextWithCredential', () => {
	it('generates text with mock model', async () => {
		const mockModel = new MockLanguageModelV3({
			doGenerate: async () => createMockDoGenerateResponse(TEST_RESPONSES.SIMPLE),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = await generateTextWithCredential(credential, {
			prompt: TEST_PROMPTS.SIMPLE,
		})

		expect(result.text).toBe(TEST_RESPONSES.SIMPLE)
		expect(result.provider).toBe('openai')
		expect(result.modelId).toBeDefined()
	})

	it('passes model override to createVercelAiChatModel', async () => {
		const mockModel = new MockLanguageModelV3({
			doGenerate: async () => createMockDoGenerateResponse(TEST_RESPONSES.ANSWER),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		await generateTextWithCredential(credential, {
			prompt: TEST_PROMPTS.QUESTION,
			model: 'gpt-4o',
		})

		expect(mockedCreateVercelAiChatModel).toHaveBeenCalledWith(credential, {
			model: 'gpt-4o',
		})
	})

	it('returns usage information', async () => {
		const mockModel = new MockLanguageModelV3({
			doGenerate: async () =>
				createMockDoGenerateResponse(TEST_RESPONSES.SIMPLE, {
					inputTokens: 15,
					outputTokens: 25,
				}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = await generateTextWithCredential(credential, {
			prompt: TEST_PROMPTS.SIMPLE,
		})

		expect(result.usage).toBeDefined()
	})

	it('returns finish reason', async () => {
		const mockModel = new MockLanguageModelV3({
			doGenerate: async () =>
				createMockDoGenerateResponse(TEST_RESPONSES.SIMPLE, {
					finishReason: 'stop',
				}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = await generateTextWithCredential(credential, {
			prompt: TEST_PROMPTS.SIMPLE,
		})

		expect(result.finishReason).toBeDefined()
	})

	it('handles length finish reason', async () => {
		const mockModel = new MockLanguageModelV3({
			doGenerate: async () =>
				createMockDoGenerateResponse('Truncated response...', {
					finishReason: 'length',
				}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = await generateTextWithCredential(credential, {
			prompt: TEST_PROMPTS.LONG,
		})

		expect(result.text).toBe('Truncated response...')
	})
})

describe('generateText with MockLanguageModelV3 (direct)', () => {
	/**
	 * These tests demonstrate direct usage of AI SDK's MockLanguageModelV3
	 * following the patterns from AI SDK documentation.
	 */

	it('generates simple text response', async () => {
		const result = await generateText({
			model: new MockLanguageModelV3({
				doGenerate: async () => createMockDoGenerateResponse('Hello, world!'),
			}),
			prompt: 'Say hello',
		})

		expect(result.text).toBe('Hello, world!')
	})

	it('generates structured text response', async () => {
		const mockResponse = JSON.stringify({ content: 'Hello, world!' })

		const result = await generateText({
			model: new MockLanguageModelV3({
				doGenerate: async () => createMockDoGenerateResponse(mockResponse),
			}),
			prompt: 'Generate JSON',
		})

		expect(result.text).toBe(mockResponse)
		const parsed = JSON.parse(result.text) as { content: string }
		expect(parsed.content).toBe('Hello, world!')
	})

	it('handles custom usage values', async () => {
		const result = await generateText({
			model: new MockLanguageModelV3({
				doGenerate: async () =>
					createMockDoGenerateResponse('Response', {
						inputTokens: 100,
						outputTokens: 50,
					}),
			}),
			prompt: 'Test prompt',
		})

		// AI SDK v6 usage structure
		expect(result.usage).toBeDefined()
		// The usage object exists, verifying it was returned from the mock
		expect(typeof result.usage).toBe('object')
	})

	it('handles error finish reason', async () => {
		const result = await generateText({
			model: new MockLanguageModelV3({
				doGenerate: async () =>
					createMockDoGenerateResponse('Error occurred', {
						finishReason: 'error',
					}),
			}),
			prompt: 'Test prompt',
		})

		expect(result.finishReason).toBe('error')
	})

	it('handles content-filter finish reason', async () => {
		const result = await generateText({
			model: new MockLanguageModelV3({
				doGenerate: async () =>
					createMockDoGenerateResponse('', {
						finishReason: 'content-filter',
					}),
			}),
			prompt: 'Filtered content',
		})

		expect(result.finishReason).toBe('content-filter')
	})
})

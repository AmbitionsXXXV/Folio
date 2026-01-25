/**
 * Tests for streamTextWithCredential using AI SDK mock providers
 *
 * Based on AI SDK v6 testing documentation:
 * https://ai-sdk.dev/docs/ai-sdk-core/testing
 *
 * Uses MockLanguageModelV3 with simulateReadableStream to provide
 * deterministic, repeatable streaming tests without calling actual LLM providers.
 */

import { simulateReadableStream, streamText } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it, vi } from 'vitest'
import {
	createMockClaudeCredential,
	createMockDeepSeekCredential,
	createMockOpenAICredential,
	createMockStreamChunks,
	TEST_PROMPTS,
	TEST_RESPONSES,
} from './mock-helpers'

// Mock the vercel-ai module to inject MockLanguageModelV3
vi.mock('../src/vercel-ai', () => ({
	createVercelAiChatModel: vi.fn(),
}))

import {
	createTextStreamResponse,
	streamTextWithCredential,
} from '../src/stream-text'
import { createVercelAiChatModel } from '../src/vercel-ai'

const mockedCreateVercelAiChatModel = vi.mocked(createVercelAiChatModel)

/**
 * Helper to collect all chunks from an async iterable
 */
async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
	const chunks: T[] = []
	for await (const chunk of stream) {
		chunks.push(chunk)
	}
	return chunks
}

describe('streamTextWithCredential', () => {
	it('streams text with mock model', async () => {
		const chunks = createMockStreamChunks(TEST_RESPONSES.SIMPLE)

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = streamTextWithCredential(credential, {
			prompt: TEST_PROMPTS.SIMPLE,
		})

		expect(result.provider).toBe('openai')
		expect(result.modelId).toBeDefined()
		expect(result.textStream).toBeDefined()

		const textChunks = await collectStream(result.textStream)
		const fullText = textChunks.join('')

		expect(fullText).toBe(TEST_RESPONSES.SIMPLE)
	})

	it('passes model override to createVercelAiChatModel', () => {
		const chunks = createMockStreamChunks(TEST_RESPONSES.ANSWER)

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		streamTextWithCredential(credential, {
			prompt: TEST_PROMPTS.QUESTION,
			model: 'gpt-4o',
		})

		expect(mockedCreateVercelAiChatModel).toHaveBeenCalledWith(credential, {
			model: 'gpt-4o',
		})
	})

	it('supports system prompt', async () => {
		const chunks = createMockStreamChunks('I am a helpful assistant.')

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = streamTextWithCredential(credential, {
			prompt: 'Who are you?',
			system: 'You are a helpful assistant.',
		})

		const textChunks = await collectStream(result.textStream)
		const fullText = textChunks.join('')

		expect(fullText).toBe('I am a helpful assistant.')
	})

	it('supports messages array for conversation mode', async () => {
		const chunks = createMockStreamChunks('The capital of France is Paris.')

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = streamTextWithCredential(credential, {
			messages: [{ role: 'user', content: 'What is the capital of France?' }],
		})

		const textChunks = await collectStream(result.textStream)
		const fullText = textChunks.join('')

		expect(fullText).toBe('The capital of France is Paris.')
	})

	it('returns fullStreamResult for advanced usage', () => {
		const chunks = createMockStreamChunks(TEST_RESPONSES.SIMPLE)

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockOpenAICredential()
		const result = streamTextWithCredential(credential, {
			prompt: TEST_PROMPTS.SIMPLE,
		})

		expect(result.fullStreamResult).toBeDefined()
	})
})

describe('streamTextWithCredential with reasoning/thinking', () => {
	it('enables reasoning for Claude provider', () => {
		const chunks = createMockStreamChunks('Thought process complete.')

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockClaudeCredential()
		const result = streamTextWithCredential(credential, {
			prompt: 'Think step by step',
			enableReasoning: true,
			reasoningBudgetTokens: 5000,
		})

		expect(result.provider).toBe('claude')
		expect(result.textStream).toBeDefined()
	})

	it('enables reasoning for DeepSeek provider', () => {
		const chunks = createMockStreamChunks('Deep thought complete.')

		const mockModel = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks }),
			}),
		})

		mockedCreateVercelAiChatModel.mockReturnValue(mockModel)

		const credential = createMockDeepSeekCredential()
		const result = streamTextWithCredential(credential, {
			prompt: 'Think deeply',
			enableReasoning: true,
		})

		expect(result.provider).toBe('deepseek')
		expect(result.textStream).toBeDefined()
	})
})

describe('createTextStreamResponse', () => {
	it('converts async iterable to ReadableStream', async () => {
		async function* generateChunks(): AsyncGenerator<string> {
			yield await Promise.resolve('Hello, ')
			yield await Promise.resolve('world!')
		}

		const readable = createTextStreamResponse(generateChunks())
		const reader = readable.getReader()
		const decoder = new TextDecoder()

		const chunks: string[] = []

		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			chunks.push(decoder.decode(value))
		}

		expect(chunks.join('')).toBe('Hello, world!')
	})

	it('handles empty stream', async () => {
		// Create an empty async iterable
		const emptyAsyncIterable: AsyncIterable<string> = {
			[Symbol.asyncIterator]: () => ({
				next: async () => ({ done: true as const, value: undefined }),
			}),
		}

		const readable = createTextStreamResponse(emptyAsyncIterable)
		const reader = readable.getReader()
		const decoder = new TextDecoder()

		const chunks: string[] = []

		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			chunks.push(decoder.decode(value))
		}

		expect(chunks.join('')).toBe('')
	})
})

describe('streamText with MockLanguageModelV3 (direct)', () => {
	/**
	 * These tests demonstrate direct usage of AI SDK's MockLanguageModelV3
	 * with simulateReadableStream following the patterns from AI SDK documentation.
	 */

	it('streams simple text response', async () => {
		const chunks = createMockStreamChunks('Hello, world!')

		const result = streamText({
			model: new MockLanguageModelV3({
				doStream: async () => ({
					stream: simulateReadableStream({ chunks }),
				}),
			}),
			prompt: 'Say hello',
		})

		const textChunks = await collectStream(result.textStream)
		const fullText = textChunks.join('')

		expect(fullText).toBe('Hello, world!')
	})

	it('streams with simulated delays', async () => {
		const chunks = createMockStreamChunks('Delayed response', { chunkSize: 3 })

		const result = streamText({
			model: new MockLanguageModelV3({
				doStream: async () => ({
					stream: simulateReadableStream({
						chunks,
						chunkDelayInMs: 10,
					}),
				}),
			}),
			prompt: 'Test with delay',
		})

		const startTime = Date.now()
		const textChunks = await collectStream(result.textStream)
		const elapsed = Date.now() - startTime

		expect(textChunks.join('')).toBe('Delayed response')
		// Should take some time due to delays
		expect(elapsed).toBeGreaterThan(0)
	})

	it('handles long streaming response', async () => {
		const longText = 'A'.repeat(1000)
		const chunks = createMockStreamChunks(longText, { chunkSize: 50 })

		const result = streamText({
			model: new MockLanguageModelV3({
				doStream: async () => ({
					stream: simulateReadableStream({ chunks }),
				}),
			}),
			prompt: 'Generate long response',
		})

		const textChunks = await collectStream(result.textStream)
		const fullText = textChunks.join('')

		expect(fullText).toBe(longText)
		expect(fullText.length).toBe(1000)
	})

	it('provides usage information after stream completes', async () => {
		const chunks = createMockStreamChunks('Response', {
			inputTokens: 50,
			outputTokens: 100,
		})

		const result = streamText({
			model: new MockLanguageModelV3({
				doStream: async () => ({
					stream: simulateReadableStream({ chunks }),
				}),
			}),
			prompt: 'Test usage',
		})

		// Consume the stream first
		await collectStream(result.textStream)

		// Then check usage - AI SDK v6 provides usage as a promise
		const usage = await result.usage
		expect(usage).toBeDefined()
		expect(typeof usage).toBe('object')
	})
})

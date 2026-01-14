/**
 * Stream text helpers (server-side)
 *
 * This module provides streaming text generation using Vercel AI SDK's streamText.
 * Returns a text stream that can be consumed progressively.
 */

import { streamText as aiStreamText } from 'ai'
import type { DecryptedCredential } from './credentials/types'
import type { AiProvider } from './providers/types'
import { createVercelAiChatModel } from './vercel-ai'

export type StreamTextInput = {
	prompt: string
	/**
	 * Optional model override.
	 * If omitted, falls back to BYOK credential/model defaults.
	 */
	model?: string
	/**
	 * Enable extended thinking/reasoning for models that support it.
	 * Currently supported by Claude, DeepSeek, and some OpenAI models.
	 */
	enableReasoning?: boolean
	/**
	 * Maximum tokens for thinking/reasoning budget.
	 * Only used when enableReasoning is true.
	 */
	reasoningBudgetTokens?: number
}

/** Full stream result type from Vercel AI SDK */
export type FullStreamResult = ReturnType<typeof aiStreamText>

export type StreamTextResult = {
	provider: AiProvider
	modelId: string
	textStream: AsyncIterable<string>
	/** Full stream result from Vercel AI SDK for accessing reasoning/thinking */
	fullStreamResult: FullStreamResult
}

/** Default reasoning budget tokens */
const DEFAULT_REASONING_BUDGET_TOKENS = 10_000

/**
 * Build provider options for extended thinking/reasoning
 */
type ProviderOptions = Parameters<typeof aiStreamText>[0]['providerOptions']

function buildProviderOptions(
	provider: AiProvider,
	enableReasoning: boolean,
	reasoningBudgetTokens: number
): ProviderOptions | undefined {
	if (!enableReasoning) return undefined

	switch (provider) {
		case 'claude':
			// Anthropic extended thinking
			return {
				anthropic: {
					thinking: {
						type: 'enabled',
						budgetTokens: reasoningBudgetTokens,
					},
				},
			}
		case 'deepseek':
		case 'qwen':
			// OpenAI-compatible providers with reasoning_effort
			return {
				openai: {
					reasoningEffort: 'medium',
				},
			}
		default:
			return undefined
	}
}

/**
 * Stream text using a decrypted BYOK credential.
 *
 * This is intended for server-side execution only.
 * Returns a streaming result that can be consumed progressively.
 */
export function streamTextWithCredential(
	credential: DecryptedCredential,
	input: StreamTextInput
): StreamTextResult {
	const model = createVercelAiChatModel(credential, { model: input.model })

	const providerOptions = buildProviderOptions(
		credential.provider,
		input.enableReasoning ?? false,
		input.reasoningBudgetTokens ?? DEFAULT_REASONING_BUDGET_TOKENS
	)

	const result = aiStreamText({
		model,
		prompt: input.prompt,
		providerOptions,
	})

	return {
		provider: credential.provider,
		modelId: model.modelId,
		textStream: result.textStream,
		fullStreamResult: result,
	}
}

/**
 * Create a ReadableStream from the text stream for HTTP streaming response.
 */
export function createTextStreamResponse(
	textStream: AsyncIterable<string>
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()

	return new ReadableStream({
		async start(controller) {
			try {
				for await (const chunk of textStream) {
					controller.enqueue(encoder.encode(chunk))
				}
				controller.close()
			} catch (error) {
				controller.error(error)
			}
		},
	})
}

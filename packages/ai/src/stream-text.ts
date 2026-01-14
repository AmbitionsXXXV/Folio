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
}

export type StreamTextResult = {
	provider: AiProvider
	modelId: string
	textStream: AsyncIterable<string>
}

/**
 * Stream text using a decrypted BYOK credential.
 *
 * This is intended for server-side execution only.
 * Returns a streaming result that can be consumed progressively.
 */
export async function streamTextWithCredential(
	credential: DecryptedCredential,
	input: StreamTextInput
): Promise<StreamTextResult> {
	const model = createVercelAiChatModel(credential, { model: input.model })
	const result = await aiStreamText({
		model,
		prompt: input.prompt,
	})

	return {
		provider: credential.provider,
		modelId: model.modelId,
		textStream: result.textStream,
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

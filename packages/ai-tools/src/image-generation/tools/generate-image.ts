import type { ImageModelV3 } from '@ai-sdk/provider'
import { generateImage as aiGenerateImage, tool } from 'ai'
import { ImageGenerationToolInputSchema } from '../schemas'

const TOOL_ABORTED_ERROR = 'Tool execution aborted.'

export type ImageGenerationResult = {
	success: boolean
	images: Array<{
		base64: string
		mediaType: string
	}>
	warnings?: string[]
	error?: string
}

/**
 * Factory that creates an image generation tool bound to a specific image model.
 *
 * The credential/model binding happens at tool creation time so sensitive data
 * never flows through the tool execution context.
 */
export function createImageGenerationTool(imageModel: ImageModelV3) {
	return tool({
		description: [
			'Generate images based on a text prompt using AI.',
			'Use when the user asks you to create, draw, generate, or design an image, illustration, photo, or artwork.',
			'Provide a detailed prompt describing the desired image including subjects, style, colors, composition, and mood.',
			'The generated images will be displayed directly in the chat.',
		].join('\n'),
		strict: true,
		inputSchema: ImageGenerationToolInputSchema,
		execute: async (
			{ prompt, n, size, aspectRatio },
			{ abortSignal }
		): Promise<ImageGenerationResult> => {
			if (abortSignal?.aborted) {
				throw new Error(TOOL_ABORTED_ERROR)
			}

			const result = await aiGenerateImage({
				model: imageModel,
				prompt,
				n: n ?? 1,
				size: size as `${number}x${number}` | undefined,
				aspectRatio: aspectRatio as `${number}:${number}` | undefined,
				abortSignal,
			})

			return {
				success: true,
				images: result.images.map((img) => ({
					base64: img.base64,
					mediaType: img.mediaType ?? 'image/png',
				})),
				warnings: result.warnings?.map(String),
			}
		},
	})
}

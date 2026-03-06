import { useCallback, useState } from 'react'
import { getServerUrl } from '@/utils/api-environment'

type GeneratedImage = {
	base64: string
	mediaType: string
}

type GenerateImageInput = {
	provider: string
	apiKey: string
	baseUrl?: string
	model?: string
	prompt: string
	n?: number
	size?: string
	aspectRatio?: string
}

type GenerateImageState = {
	isGenerating: boolean
	images: GeneratedImage[]
	error: string | null
}

export function useGenerateImage() {
	const [state, setState] = useState<GenerateImageState>({
		isGenerating: false,
		images: [],
		error: null,
	})

	const generate = useCallback(async (input: GenerateImageInput) => {
		setState({ isGenerating: true, images: [], error: null })

		try {
			const response = await fetch(`${getServerUrl()}/api/ai/generate-image`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(input),
			})

			if (!response.ok) {
				const data = await response.json()
				const errorMsg = data?.error ?? `HTTP ${response.status}`
				setState((prev) => ({ ...prev, isGenerating: false, error: errorMsg }))
				return null
			}

			const data = await response.json()
			const images = data.images as GeneratedImage[]
			setState({ isGenerating: false, images, error: null })
			return images
		} catch (error) {
			let message = 'An unexpected error occurred.'
			if (error instanceof TypeError) {
				message = 'Network error. Please check your connection and try again.'
			} else if (error instanceof Error) {
				message = error.message
			}
			setState((prev) => ({ ...prev, isGenerating: false, error: message }))
			return null
		}
	}, [])

	const reset = useCallback(() => {
		setState({ isGenerating: false, images: [], error: null })
	}, [])

	return {
		...state,
		generate,
		reset,
	}
}

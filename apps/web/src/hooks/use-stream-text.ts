import { useCallback, useRef, useState } from 'react'
import { getServerUrl } from '@/utils/api-environment'

type StreamTextParams = {
	provider: string
	apiKey: string
	baseUrl?: string
	model?: string
	prompt: string
}

type StreamTextState = {
	isStreaming: boolean
	text: string
	error: Error | null
}

type StreamTextResult = {
	stream: (params: StreamTextParams) => Promise<void>
	cancel: () => void
	reset: () => void
} & StreamTextState

/**
 * Hook for streaming text generation from the AI endpoint.
 * Returns text progressively as it's received from the server.
 */
export function useStreamText(): StreamTextResult {
	const [state, setState] = useState<StreamTextState>({
		isStreaming: false,
		text: '',
		error: null,
	})

	const abortControllerRef = useRef<AbortController | null>(null)

	const setupAbortController = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}
		const abortController = new AbortController()
		abortControllerRef.current = abortController
		return abortController
	}

	const initializeStreamState = () => {
		setState({
			isStreaming: true,
			text: '',
			error: null,
		})
	}

	const makeStreamRequest = async (
		params: StreamTextParams,
		signal: AbortSignal
	) => {
		const response = await fetch(`${getServerUrl()}/api/ai/stream`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify(params),
			signal,
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			throw new Error(
				(errorData as { error?: string }).error ||
					`HTTP error! status: ${response.status}`
			)
		}

		return response
	}

	const processStream = async (response: Response) => {
		const reader = response.body?.getReader()
		if (!reader) {
			throw new Error('Response body is not readable')
		}

		const decoder = new TextDecoder()
		let accumulatedText = ''

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })
			accumulatedText += chunk

			setState((prev) => ({
				...prev,
				text: accumulatedText,
			}))
		}
	}

	const handleError = (error: unknown) => {
		if ((error as Error).name === 'AbortError') {
			setState((prev) => ({
				...prev,
				isStreaming: false,
			}))
			return
		}

		setState({
			isStreaming: false,
			text: '',
			error: error instanceof Error ? error : new Error('Unknown error'),
		})
	}

	const stream = useCallback(async (params: StreamTextParams) => {
		const abortController = setupAbortController()
		initializeStreamState()

		try {
			const response = await makeStreamRequest(params, abortController.signal)
			await processStream(response)

			setState((prev) => ({
				...prev,
				isStreaming: false,
			}))
		} catch (error) {
			handleError(error)
		} finally {
			if (abortControllerRef.current === abortController) {
				abortControllerRef.current = null
			}
		}
	}, [])

	const cancel = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
		}
	}, [])

	const reset = useCallback(() => {
		cancel()
		setState({
			isStreaming: false,
			text: '',
			error: null,
		})
	}, [cancel])

	return {
		...state,
		stream,
		cancel,
		reset,
	}
}

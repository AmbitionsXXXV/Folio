import { useCallback, useRef, useState } from 'react'
import { getServerUrl } from '@/utils/api-environment'

type StreamTextParams = {
	provider: string
	apiKey: string
	baseUrl?: string
	model?: string
	prompt: string
	/** Optional: IDs of notes to attach as context */
	noteEntryIds?: string[]
	/** Optional: Number of notes to retrieve via RAG */
	ragTopK?: number
	/** Optional: Enable extended thinking/reasoning */
	enableReasoning?: boolean
}

type StreamTextState = {
	isStreaming: boolean
	text: string
	/** Thinking/reasoning content from models that support it */
	thinking: string
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
		thinking: '',
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
			thinking: '',
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

	/** Delimiter used to mark thinking content in the stream */
	const THINKING_DELIMITER = '\x1E__THINKING__\x1E'

	/** Parse accumulated stream content to extract text and thinking */
	const parseStreamContent = (
		content: string
	): { text: string; thinking: string } => {
		let text = ''
		let thinking = ''
		let remaining = content

		while (remaining.includes(THINKING_DELIMITER)) {
			const delimiterIdx = remaining.indexOf(THINKING_DELIMITER)
			// Content before delimiter is regular text
			text += remaining.slice(0, delimiterIdx)

			// Find the end of thinking content
			const thinkingStart = delimiterIdx + THINKING_DELIMITER.length
			const nextDelimiter = remaining.indexOf(THINKING_DELIMITER, thinkingStart)

			if (nextDelimiter !== -1) {
				// Complete thinking segment found
				thinking += remaining.slice(thinkingStart, nextDelimiter)
				remaining = remaining.slice(nextDelimiter + THINKING_DELIMITER.length)
			} else {
				// Incomplete thinking - append to thinking for now
				thinking += remaining.slice(thinkingStart)
				remaining = ''
			}
		}

		// Any remaining content is regular text
		text += remaining
		return { text, thinking }
	}

	const processStream = async (response: Response) => {
		const reader = response.body?.getReader()
		if (!reader) {
			throw new Error('Response body is not readable')
		}

		const decoder = new TextDecoder()
		let fullContent = ''

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })
			fullContent += chunk

			const { text, thinking } = parseStreamContent(fullContent)
			setState((prev) => ({
				...prev,
				text,
				thinking,
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
			thinking: '',
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
			thinking: '',
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

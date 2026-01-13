import { describe, expect, it } from 'vitest'
import type { DecryptedCredential } from '../src/credentials/types'
import {
	createVercelAiChatModel,
	createVercelAiEmbeddingModel,
} from '../src/vercel-ai'

const GEMINI_EMBEDDING_OPENAI_COMPAT_REGEX =
	/Gemini embedding is not supported via OpenAI compatible baseUrl/

describe('vercel-ai model factories', () => {
	it('creates chat model for openai-compatible providers', () => {
		const credential: DecryptedCredential = {
			provider: 'openai',
			apiKey: 'test-key',
			baseUrl: 'https://api.openai.com/v1',
			model: 'gpt-4o-mini',
		}

		const model = createVercelAiChatModel(credential)
		expect(model).toBeDefined()
	})

	it('creates embedding model for openai-compatible providers', () => {
		const credential: DecryptedCredential = {
			provider: 'openai',
			apiKey: 'test-key',
			baseUrl: 'https://api.openai.com/v1',
		}

		const model = createVercelAiEmbeddingModel(credential, {
			model: 'text-embedding-3-small',
		})
		expect(model).toBeDefined()
	})

	it('creates embedding model for Gemini (native baseUrl)', () => {
		const credential: DecryptedCredential = {
			provider: 'gemini',
			apiKey: 'test-key',
			baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
		}

		const model = createVercelAiEmbeddingModel(credential, {
			model: 'text-embedding-004',
		})
		expect(model).toBeDefined()
	})

	it('throws for Gemini embedding on OpenAI compatible baseUrl', () => {
		const credential: DecryptedCredential = {
			provider: 'gemini',
			apiKey: 'test-key',
			baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		}

		expect(() => createVercelAiEmbeddingModel(credential)).toThrow(
			GEMINI_EMBEDDING_OPENAI_COMPAT_REGEX
		)
	})
})

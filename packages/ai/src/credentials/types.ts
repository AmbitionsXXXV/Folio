/**
 * BYOK Credentials types
 *
 * Server-side BYOK: User stores encrypted API key on server
 * - All AI calls go through server (enables RAG, audit, rate limiting)
 * - Web/iOS clients never see the raw key
 */

import type { AiProvider } from '../providers/types'

/**
 * Credential status
 */
export type CredentialStatus = 'active' | 'invalid' | 'expired' | 'revoked'

/**
 * User AI credential (stored in database)
 */
export interface UserAiCredential {
	/** Optional custom base URL override */
	baseUrl?: string
	createdAt: Date
	/** Encrypted API key (never store plaintext) */
	encryptedApiKey: string
	id: string
	/** Last 4 chars of key for display (e.g., "...abcd") */
	keyHint: string
	lastValidatedAt?: Date
	/** Optional custom model override */
	model?: string
	provider: AiProvider
	status: CredentialStatus
	updatedAt: Date
	userId: string
}

/**
 * Credential input for creating/updating
 */
export interface CredentialInput {
	apiKey: string
	baseUrl?: string
	model?: string
	provider: AiProvider
}

/**
 * Decrypted credential for internal use (never expose to client)
 */
export interface DecryptedCredential {
	apiKey: string
	baseUrl: string
	model?: string
	provider: AiProvider
}

/**
 * Credential crypto interface
 *
 * Implementation should use:
 * - AES-256-GCM for encryption
 * - Environment variable AI_KEY_ENCRYPTION_SECRET as master key
 */
export interface CredentialCrypto {
	/**
	 * Decrypt API key for use
	 */
	decrypt(ciphertext: string): Promise<string>
	/**
	 * Encrypt API key for storage
	 */
	encrypt(plaintext: string): Promise<string>
}

/**
 * Credential store interface
 */
export interface CredentialStore {
	/**
	 * Delete credential
	 */
	delete(userId: string, provider: AiProvider): Promise<void>
	/**
	 * Get user's credential for a provider
	 */
	get(userId: string, provider: AiProvider): Promise<UserAiCredential | null>

	/**
	 * List all credentials for a user
	 */
	list(userId: string): Promise<UserAiCredential[]>

	/**
	 * Update credential status (e.g., after validation)
	 */
	updateStatus(
		userId: string,
		provider: AiProvider,
		status: CredentialStatus
	): Promise<void>

	/**
	 * Create or update credential
	 */
	upsert(userId: string, input: CredentialInput): Promise<UserAiCredential>
}

/**
 * Credential validator interface
 */
export interface CredentialValidator {
	/**
	 * Validate credential by making a test API call
	 */
	validate(credential: DecryptedCredential): Promise<boolean>
}

const STORAGE_KEY = 'folionote:api-environment'

export type ApiEnvironment = 'local' | 'remote'

type ApiEnvironmentConfig = {
	local: string
	remote: string
}

const DEFAULT_CONFIG: ApiEnvironmentConfig = {
	local: 'http://localhost:3000',
	remote: 'https://api.folionote.xyz',
}

/**
 * Get the API environment from localStorage (non-React utility)
 */
export function getStoredApiEnvironment(): ApiEnvironment {
	if (typeof window === 'undefined') {
		return 'local'
	}

	// Check if we're in production build
	const isProduction = import.meta.env.MODE === 'production'
	if (isProduction) return 'remote'

	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored === 'local' || stored === 'remote') {
			return stored
		}
	} catch (error) {
		console.error('Failed to load API environment from localStorage:', error)
	}

	return 'local'
}

/**
 * Get the server URL based on environment configuration
 */
export function getServerUrl(): string {
	// In production, always use the env var if available
	const isProduction = import.meta.env.MODE === 'production'
	if (isProduction && import.meta.env.VITE_SERVER_URL) {
		return import.meta.env.VITE_SERVER_URL as string
	}

	// In development, use stored environment preference
	const environment = getStoredApiEnvironment()
	return DEFAULT_CONFIG[environment]
}

/**
 * Save API environment to localStorage and reload page
 */
export function setApiEnvironment(env: ApiEnvironment): void {
	if (typeof window === 'undefined') return

	try {
		localStorage.setItem(STORAGE_KEY, env)
		// Force page reload to apply new API URL
		window.location.reload()
	} catch (error) {
		console.error('Failed to save API environment to localStorage:', error)
	}
}

/**
 * Theme options for the profile page
 */
export type ThemeOption = 'light' | 'dark' | 'system'

/**
 * User profile data structure
 */
export type UserProfile = {
	id: string
	name: string
	email: string
	emailVerified: boolean
	createdAt: Date
	updatedAt: Date
	no?: number | null
	image?: string | null
}

/**
 * Profile card props
 */
export type ProfileCardProps = {
	user: UserProfile | null | undefined
	currentImageUrl: string | null | undefined
	onLocalImageUrlChange: (url: string | null) => void
}

/**
 * Appearance settings props
 */
export type AppearanceSettingsProps = {
	mounted: boolean
}

/**
 * Language settings props (currently empty, can be extended)
 */
export type LanguageSettingsProps = Record<string, never>

/**
 * Danger zone props
 */
export type DangerZoneProps = {
	onSignOut: () => void
}

// ==================== Settings Nested Structure ====================

/**
 * User settings section - contains user profile related settings
 */
export interface UserSettings {
	profile: {
		displayName?: string
		avatar?: string
		bio?: string
	}
	preferences: {
		theme: ThemeOption
		language: string
		timezone?: string
	}
	notifications: {
		email: boolean
		push: boolean
		digest: 'daily' | 'weekly' | 'never'
	}
}

/**
 * AI Provider settings section - contains AI provider configurations
 */
export interface AiProviderSettings {
	/** Currently active provider */
	activeProvider?: string
	/** Provider-specific configurations */
	providers: Record<
		string,
		{
			enabled: boolean
			apiKey?: string
			baseUrl?: string
			defaultModel?: string
		}
	>
	/** Global AI settings */
	global: {
		defaultProvider?: string
		streamingEnabled: boolean
		maxTokens?: number
	}
}

/**
 * Root settings structure with nested sections
 */
export interface SettingsRoot {
	user: UserSettings
	aiProvider: AiProviderSettings
}

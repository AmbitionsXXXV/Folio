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

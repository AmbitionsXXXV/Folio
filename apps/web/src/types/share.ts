/**
 * ORPC error code type for share API responses
 */
export type ORPCErrorCode =
	| 'NOT_FOUND'
	| 'FORBIDDEN'
	| 'UNAUTHORIZED'
	| 'INTERNAL_SERVER_ERROR'

/**
 * Error message structure for display
 */
export type ShareErrorMessage = {
	title: string
	description: string
}

/**
 * Shared entry data structure
 */
export type SharedEntryData = {
	entry: {
		title: string
		contentJson: string | null
		createdAt: string
	}
	share: {
		showBranding: boolean
	}
}

/**
 * Password form props
 */
export type PasswordFormProps = {
	password: string
	onPasswordChange: (value: string) => void
	onSubmit: () => void
	isPending: boolean
	error: Error | null
}

/**
 * Share content props
 */
export type ShareContentProps = {
	entryData: SharedEntryData
}

/**
 * Share error page props
 */
export type ShareErrorPageProps = {
	title: string
	description: string
}

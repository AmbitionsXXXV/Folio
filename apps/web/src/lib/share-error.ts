import type { ORPCErrorCode, ShareErrorMessage } from '@/types/share'

/**
 * Parse error message from API error using ORPC error codes
 */
export function getShareErrorMessage(error: unknown): ShareErrorMessage {
	// Check for ORPC error with code property
	if (error && typeof error === 'object' && 'code' in error) {
		const code = (error as { code: ORPCErrorCode }).code
		const message = 'message' in error ? (error as { message: string }).message : ''

		switch (code) {
			case 'NOT_FOUND':
				return {
					title: 'Link Not Found',
					description: 'This share link does not exist or has been removed.',
				}
			case 'FORBIDDEN':
				// Check message for more specific forbidden reason
				if (message.includes('expired')) {
					return {
						title: 'Link Expired',
						description: 'This share link has expired and is no longer accessible.',
					}
				}
				if (message.includes('disabled')) {
					return {
						title: 'Link Disabled',
						description: 'This share link has been disabled by its owner.',
					}
				}
				return {
					title: 'Access Denied',
					description: message || 'You do not have permission to access this link.',
				}
			case 'UNAUTHORIZED':
				return {
					title: 'Authentication Required',
					description: message || 'Please provide valid credentials.',
				}
			case 'INTERNAL_SERVER_ERROR':
				return {
					title: 'Server Error',
					description: 'An internal server error occurred. Please try again later.',
				}
			default:
				return {
					title: 'Error',
					description: message || 'An unexpected error occurred.',
				}
		}
	}

	// Fallback for errors without code
	if (error && typeof error === 'object' && 'message' in error) {
		return {
			title: 'Error',
			description: (error as { message: string }).message,
		}
	}

	return {
		title: 'Error',
		description: 'An unexpected error occurred.',
	}
}

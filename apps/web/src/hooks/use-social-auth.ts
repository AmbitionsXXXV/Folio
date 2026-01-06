import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

type SocialProvider = 'google' | 'github' | 'apple'

type UseSocialAuthOptions = {
	/**
	 * The social provider to authenticate with
	 */
	provider: SocialProvider
	/**
	 * The URL to redirect to after successful authentication
	 */
	callbackURL: string
	/**
	 * Custom error message key for i18n (defaults to 'auth.signInFailed')
	 */
	errorMessageKey?: string
}

/**
 * Hook for handling social authentication with proper error handling and loading states.
 *
 * Uses TanStack Query's useMutation for consistent async state management across the app.
 * On success, the OAuth flow will redirect the user, so no success callback is needed.
 * On failure, displays a toast error and resets the loading state.
 *
 * @example
 * ```tsx
 * const googleAuth = useSocialAuth({
 *   provider: 'google',
 *   callbackURL: '/dashboard',
 * })
 *
 * <Button onClick={() => googleAuth.mutate()} disabled={googleAuth.isPending}>
 *   {googleAuth.isPending ? <Spinner /> : 'Continue with Google'}
 * </Button>
 * ```
 */
export function useSocialAuth({
	provider,
	callbackURL,
	errorMessageKey = 'auth.signInFailed',
}: UseSocialAuthOptions) {
	const { t } = useTranslation()

	return useMutation({
		mutationFn: () =>
			authClient.signIn.social({
				provider,
				callbackURL,
			}),
		onError: (error) => {
			toast.error(t(errorMessageKey))
			if (import.meta.env.DEV) {
				console.error(`[SocialAuth:${provider}] Auth error:`, error)
			}
		},
	})
}

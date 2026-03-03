import { LANGUAGE_LABELS } from '@folionote/constants'
import type { SupportedLanguage } from '@folionote/locales'
import { supportedLanguages } from '@folionote/locales'
import * as Localization from 'expo-localization'
import * as SecureStore from 'expo-secure-store'
import { useCallback, useEffect, useState } from 'react'
import { Appearance } from 'react-native'

const FIRST_LAUNCH_KEY = 'folio_first_launch_completed'

interface SystemPreferences {
	/**
	 * Detected system language that is supported by the app
	 * Returns null if the system language is not supported
	 */
	detectedLanguage: SupportedLanguage | null
	/**
	 * Human-readable label for the detected language
	 */
	detectedLanguageLabel: string | null
	/**
	 * System color scheme (light or dark)
	 */
	systemColorScheme: 'light' | 'dark'
}

interface UseFirstLaunchResult {
	/**
	 * Mark the first launch as completed
	 */
	completeFirstLaunch: () => Promise<void>
	/**
	 * Whether this is the first launch of the app
	 */
	isFirstLaunch: boolean
	/**
	 * Whether the first launch check is still loading
	 */
	isLoading: boolean
	/**
	 * System preferences detected from the device
	 */
	systemPreferences: SystemPreferences | null
}

/**
 * Detect the system language and return a supported language if available
 */
function detectSystemLanguage(): SupportedLanguage | null {
	const locales = Localization.getLocales()
	const deviceLocale = locales[0]?.languageTag

	if (!deviceLocale) {
		return null
	}

	const normalizedLocale = deviceLocale.toLowerCase()

	// Check for exact match first
	for (const lang of supportedLanguages) {
		if (normalizedLocale === lang.toLowerCase()) {
			return lang
		}
	}

	// Check for language code match (e.g., zh-TW -> zh-CN)
	if (normalizedLocale.startsWith('zh')) {
		return 'zh-CN'
	}
	if (normalizedLocale.startsWith('ja')) {
		return 'ja-JP'
	}
	if (normalizedLocale.startsWith('en')) {
		return 'en-US'
	}

	// Check for partial match
	for (const lang of supportedLanguages) {
		const langCode = lang.toLowerCase().split('-')[0]
		if (normalizedLocale.startsWith(langCode)) {
			return lang
		}
	}

	return null
}

/**
 * Hook to detect first launch and system preferences
 */
export function useFirstLaunch(
	currentLanguage: SupportedLanguage
): UseFirstLaunchResult {
	const [isLoading, setIsLoading] = useState(true)
	const [isFirstLaunch, setIsFirstLaunch] = useState(false)
	const [systemPreferences, setSystemPreferences] =
		useState<SystemPreferences | null>(null)

	useEffect(() => {
		async function checkFirstLaunch() {
			try {
				const hasLaunched = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY)

				if (hasLaunched === 'true') {
					// Not first launch, skip detection
					setIsFirstLaunch(false)
					setIsLoading(false)
					return
				}

				// First launch - detect system preferences
				const detectedLanguage = detectSystemLanguage()
				const rawScheme = Appearance.getColorScheme()
				const systemColorScheme: 'light' | 'dark' =
					rawScheme === 'dark' ? 'dark' : 'light'

				// Only show language prompt if detected language differs from current
				// and is actually supported
				const shouldPromptLanguage =
					detectedLanguage !== null && detectedLanguage !== currentLanguage

				setSystemPreferences({
					detectedLanguage: shouldPromptLanguage ? detectedLanguage : null,
					detectedLanguageLabel: shouldPromptLanguage
						? LANGUAGE_LABELS[detectedLanguage]
						: null,
					systemColorScheme,
				})

				setIsFirstLaunch(true)
			} catch (error) {
				console.error('Failed to check first launch:', error)
			} finally {
				setIsLoading(false)
			}
		}

		checkFirstLaunch()
	}, [currentLanguage])

	const completeFirstLaunch = useCallback(async () => {
		try {
			await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, 'true')
			setIsFirstLaunch(false)
		} catch (error) {
			console.error('Failed to complete first launch:', error)
		}
	}, [])

	return {
		isLoading,
		isFirstLaunch,
		systemPreferences,
		completeFirstLaunch,
	}
}

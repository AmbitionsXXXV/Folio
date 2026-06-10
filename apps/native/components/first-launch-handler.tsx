import type { SupportedLanguage } from "@folionote/locales"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { useAppTheme } from "@/contexts/app-theme-context"
import { useFirstLaunch } from "@/hooks"

import { LanguageDetectionDialog } from "./language-detection-dialog"

/**
 * Component that handles first launch detection and system preferences
 * - Detects system language and prompts user to switch if different
 * - Automatically applies system color scheme on first launch
 */
export function FirstLaunchHandler() {
  const { i18n } = useTranslation()
  const { setTheme } = useAppTheme()
  const currentLanguage = i18n.language as SupportedLanguage

  const { isLoading, isFirstLaunch, systemPreferences, completeFirstLaunch } =
    useFirstLaunch(currentLanguage)

  const [showLanguageDialog, setShowLanguageDialog] = useState(false)

  // Handle first launch: apply system theme and show language dialog if needed
  useEffect(() => {
    if (isLoading || !isFirstLaunch || !systemPreferences) {
      return
    }

    // Apply system color scheme immediately
    setTheme(systemPreferences.systemColorScheme)

    // Show language dialog if detected language differs from current
    if (
      systemPreferences.detectedLanguage &&
      systemPreferences.detectedLanguageLabel
    ) {
      setShowLanguageDialog(true)
    } else {
      // No language change needed, mark first launch as complete
      completeFirstLaunch()
    }
  }, [
    isLoading,
    isFirstLaunch,
    systemPreferences,
    setTheme,
    completeFirstLaunch
  ])

  const handleLanguageConfirm = useCallback(async () => {
    if (systemPreferences?.detectedLanguage) {
      await i18n.changeLanguage(systemPreferences.detectedLanguage)
    }
    setShowLanguageDialog(false)
    await completeFirstLaunch()
  }, [i18n, systemPreferences, completeFirstLaunch])

  const handleLanguageCancel = useCallback(async () => {
    setShowLanguageDialog(false)
    await completeFirstLaunch()
  }, [completeFirstLaunch])

  // Don't render anything if not first launch or no language to prompt
  const detectedLabel = systemPreferences?.detectedLanguageLabel
  if (!(showLanguageDialog && detectedLabel)) {
    return null
  }

  return (
    <LanguageDetectionDialog
      detectedLanguageLabel={detectedLabel}
      isOpen={showLanguageDialog}
      onCancel={handleLanguageCancel}
      onConfirm={handleLanguageConfirm}
    />
  )
}

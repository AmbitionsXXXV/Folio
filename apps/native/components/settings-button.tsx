import { LANGUAGE_LABELS } from "@folionote/constants"
import { supportedLanguages } from "@folionote/locales"
import type { SupportedLanguage } from "@folionote/locales"
import { LanguageSkillIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react-native"
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics"
import { cn, useThemeColor } from "heroui-native"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Modal, Platform, Pressable, Text } from "react-native"

export function SettingsButton() {
  const { t, i18n } = useTranslation()
  const [visible, setVisible] = useState(false)
  const foregroundColor = useThemeColor("foreground")

  const currentLanguage = i18n.language as SupportedLanguage

  function handleLanguageChange(lang: SupportedLanguage) {
    if (Platform.OS === "ios") {
      impactAsync(ImpactFeedbackStyle.Light)
    }
    i18n.changeLanguage(lang)
    setVisible(false)
  }

  return (
    <>
      <Pressable
        className="px-2.5"
        onPress={() => {
          if (Platform.OS === "ios") {
            impactAsync(ImpactFeedbackStyle.Light)
          }
          setVisible(true)
        }}
      >
        <HugeiconsIcon
          color={foregroundColor}
          icon={LanguageSkillIcon}
          size={20}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        transparent
        visible={visible}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setVisible(false)}
        >
          <Pressable
            className="mx-6 w-72 rounded-2xl bg-surface p-4"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="mb-4 text-center text-lg font-semibold text-foreground">
              {t("common.language")}
            </Text>

            {supportedLanguages.map((lang) => (
              <Pressable
                className={cn(
                  "flex-row items-center justify-between rounded-xl px-4 py-3",
                  currentLanguage === lang ? "bg-accent" : "bg-transparent"
                )}
                key={lang}
                onPress={() => handleLanguageChange(lang)}
              >
                <Text
                  className="text-base"
                  style={{
                    color: foregroundColor,
                    fontWeight: currentLanguage === lang ? "600" : "400"
                  }}
                >
                  {LANGUAGE_LABELS[lang]}
                </Text>
                {currentLanguage === lang && (
                  <HugeiconsIcon
                    color={foregroundColor}
                    icon={Tick02Icon}
                    size={20}
                  />
                )}
              </Pressable>
            ))}

            <Pressable
              className="mt-4 items-center rounded-xl bg-background py-3"
              onPress={() => setVisible(false)}
            >
              <Text className="font-medium" style={{ color: foregroundColor }}>
                {t("common.close")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

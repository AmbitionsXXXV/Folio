import {
  formatUserNo,
  getDaysSince,
  LANGUAGE_LABELS
} from "@folionote/constants"
import { supportedLanguages } from "@folionote/locales"
import type { SupportedLanguage } from "@folionote/locales"
import {
  ArrowRight01Icon,
  Delete02Icon,
  Logout03Icon,
  Moon02Icon,
  Sun03Icon,
  Tick02Icon,
  TranslationIcon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react-native"
import Constants from "expo-constants"
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics"
import { router } from "expo-router"
import {
  Avatar,
  BottomSheet,
  Button,
  cn,
  Dialog,
  PressableFeedback,
  Switch,
  useThemeColor
} from "heroui-native"
import { useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  View
} from "react-native"
import Animated, { ZoomIn } from "react-native-reanimated"

import { Container } from "@/components/container"
import { useAppTheme } from "@/contexts/app-theme-context"
import { useAvatarState } from "@/hooks"
import { authClient } from "@/lib/auth-client"

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const { data: session } = authClient.useSession()
  const { isLight, toggleTheme } = useAppTheme()
  const [languageModalVisible, setLanguageModalVisible] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const { currentImageUrl, user } = useAvatarState()

  const mutedColor = useThemeColor("muted")
  const accentColor = useThemeColor("accent")
  const dangerColor = useThemeColor("danger")
  const infoColor = useThemeColor("default")
  const accentForegroundColor = useThemeColor("accent-foreground")

  const currentLanguage = i18n.language as SupportedLanguage

  const handleLanguageChange = useCallback(
    (lang: SupportedLanguage) => {
      if (Platform.OS === "ios") {
        impactAsync(ImpactFeedbackStyle.Light)
      }
      i18n.changeLanguage(lang)
      setLanguageModalVisible(false)
    },
    [i18n]
  )

  const handleThemeToggle = useCallback(() => {
    if (Platform.OS === "ios") {
      impactAsync(ImpactFeedbackStyle.Light)
    }
    toggleTheme()
  }, [toggleTheme])

  const handleSignOutPress = useCallback(() => {
    if (Platform.OS === "ios") {
      impactAsync(ImpactFeedbackStyle.Light)
    }
    setSignOutDialogOpen(true)
  }, [])

  const handleSignOutConfirm = useCallback(async () => {
    if (Platform.OS === "ios") {
      impactAsync(ImpactFeedbackStyle.Medium)
    }
    setSignOutDialogOpen(false)
    setIsSigningOut(true)
    try {
      // 首先撤销所有其他 session，确保彻底登出
      try {
        await authClient.revokeSessions()
      } catch (error) {
        console.warn("Failed to revoke sessions:", error)
      }

      // 然后执行标准的 signOut
      await authClient.signOut()
      router.replace("/(auth)/sign-in")
    } catch {
      // Handle error silently
    } finally {
      setIsSigningOut(false)
    }
  }, [])

  return (
    <Container className="flex-1" disableScroll disableTopInset>
      <ScrollView
        // iOS: 自动调整内容偏移以适应透明 header (Liquid Glass)
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* User Info - Navigate to Profile */}
        {session?.user && (
          <PressableFeedback
            className="mb-6 overflow-hidden rounded-2xl text-shadow-accent"
            onPress={() => router.push("/profile")}
            style={{
              shadowColor: "#8B5CF6",
              shadowOffset: {
                width: 0,
                height: 4
              },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8
            }}
          >
            <View
              style={{
                padding: 16,
                borderRadius: 16,
                experimental_backgroundImage: `linear-gradient(135deg, ${accentColor}95, ${accentColor}60, ${accentColor}25)`
              }}
            >
              <View className="flex-row items-center">
                {/* Avatar */}
                <View
                  className="mr-3 rounded-full bg-white p-[3px] text-shadow-black"
                  style={{
                    shadowOffset: {
                      width: 0,
                      height: 2
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <Avatar
                    alt={user?.name ?? "User avatar"}
                    className="size-14 shadow-lg"
                    color="accent"
                  >
                    {currentImageUrl && (
                      <Avatar.Image source={{ uri: currentImageUrl }} />
                    )}
                    <Avatar.Fallback>
                      {user?.name
                        ?.split(" ")
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) ?? "?"}
                    </Avatar.Fallback>
                  </Avatar>
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-lg font-semibold text-foreground">
                      {session.user.name ?? t("common.other")}
                    </Text>
                  </View>

                  {/* Founding Member Badge & Joined Days */}
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-muted">
                      {t("profile.foundingMember")}
                    </Text>
                    {user?.no && (
                      <Text
                        className="text-sm font-semibold text-accent"
                        style={{ fontFamily: "LeckerliOne" }}
                      >
                        No.{formatUserNo(user.no)}
                      </Text>
                    )}
                  </View>

                  {/* Joined Days */}
                  <View className="mt-1 flex-row items-center gap-1">
                    <Text className="text-xs text-muted">
                      <Trans
                        components={{
                          1: (
                            <Text
                              className="text-xs font-semibold text-accent"
                              style={{ fontFamily: "LeckerliOne" }}
                            />
                          )
                        }}
                        i18nKey="profile.joinedDays"
                        values={{ count: getDaysSince(user?.createdAt) }}
                      />
                    </Text>
                  </View>
                </View>

                <HugeiconsIcon
                  color={mutedColor}
                  icon={ArrowRight01Icon}
                  size={20}
                />
              </View>
            </View>
          </PressableFeedback>
        )}

        {/* Appearance Section */}
        <Text className="mb-3 text-lg font-semibold text-foreground">
          {t("common.theme")}
        </Text>

        <PressableFeedback
          className="mb-3 rounded-3xl bg-[#FFFBFF] p-4 dark:bg-[#3f324a]"
          onPress={handleThemeToggle}
        >
          <View className="flex-row items-center">
            <View className="mr-3 size-10 items-center justify-center rounded-lg bg-accent/10">
              <HugeiconsIcon
                color={accentColor}
                icon={isLight ? Sun03Icon : Moon02Icon}
                size={24}
              />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">
                {t("common.theme")}
              </Text>
              <Text className="text-sm text-muted">
                {isLight ? t("common.themeLight") : t("common.themeDark")}
              </Text>
            </View>
            <Switch
              animation={{
                backgroundColor: {
                  value: [mutedColor, accentColor]
                }
              }}
              className="h-[32px] w-[56px]"
              isSelected={isLight}
              onSelectedChange={handleThemeToggle}
            >
              <Switch.Thumb
                animation={{
                  left: {
                    value: 4,
                    springConfig: {
                      damping: 30,
                      stiffness: 300,
                      mass: 1
                    }
                  }
                }}
                className="size-[22px]"
              />
              <Switch.StartContent className="left-2">
                {isLight && (
                  <Animated.View entering={ZoomIn.springify()} key="sun">
                    <HugeiconsIcon
                      color={accentForegroundColor}
                      icon={Sun03Icon}
                      size={16}
                    />
                  </Animated.View>
                )}
              </Switch.StartContent>
              <Switch.EndContent className="right-2">
                {!isLight && (
                  <Animated.View entering={ZoomIn.springify()} key="moon">
                    <HugeiconsIcon
                      color={infoColor}
                      icon={Moon02Icon}
                      size={16}
                    />
                  </Animated.View>
                )}
              </Switch.EndContent>
            </Switch>
          </View>
        </PressableFeedback>

        {/* Language Section */}
        <Text className="mt-4 mb-3 text-lg font-semibold text-foreground">
          {t("common.language")}
        </Text>

        <PressableFeedback
          className="mb-3 rounded-2xl bg-[#FFFBFF] p-4 dark:bg-[#3f324a]"
          onPress={() => setLanguageModalVisible(true)}
        >
          <View className="flex-row items-center">
            <View className="bg-success/10 mr-3 size-10 items-center justify-center rounded-lg">
              <HugeiconsIcon
                color={useThemeColor("success")}
                icon={TranslationIcon}
                size={24}
              />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-foreground">
                {t("common.language")}
              </Text>
              <Text className="text-sm text-muted">
                {LANGUAGE_LABELS[currentLanguage]}
              </Text>
            </View>
            <HugeiconsIcon
              color={mutedColor}
              icon={ArrowRight01Icon}
              size={20}
            />
          </View>
        </PressableFeedback>

        {/* Danger Zone Section */}
        {session?.user && (
          <>
            <Text className="text-danger mt-4 mb-3 text-lg font-semibold">
              {t("profile.dangerZone")}
            </Text>

            {/* Sign Out */}
            <PressableFeedback
              className="border-danger/30 mb-3 rounded-2xl border bg-[#FFFBFF] p-4 dark:bg-[#3f324a]"
              isDisabled={isSigningOut}
              onPress={handleSignOutPress}
            >
              <View className="flex-row items-center">
                <View className="bg-danger/10 mr-3 size-10 items-center justify-center rounded-lg">
                  <HugeiconsIcon
                    color={dangerColor}
                    icon={Logout03Icon}
                    size={24}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-danger font-medium">
                    {t("profile.signOutAllDevices")}
                  </Text>
                  <Text className="text-xs text-muted">
                    {t("profile.signOutAllDevicesDescription")}
                  </Text>
                </View>
                {isSigningOut && (
                  <ActivityIndicator color={dangerColor} size="small" />
                )}
              </View>
            </PressableFeedback>

            {/* Delete Account */}
            <PressableFeedback
              className="border-danger/30 mb-3 rounded-2xl border bg-[#FFFBFF] p-4 opacity-50 dark:bg-[#3f324a]"
              isDisabled
            >
              <View className="flex-row items-center">
                <View className="bg-danger/10 mr-3 size-10 items-center justify-center rounded-lg">
                  <HugeiconsIcon
                    color={dangerColor}
                    icon={Delete02Icon}
                    size={24}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-danger font-medium">
                    {t("profile.deleteAccount")}
                  </Text>
                  <Text className="text-xs text-muted">
                    {t("profile.deleteAccountDescription")}
                  </Text>
                </View>
              </View>
            </PressableFeedback>
          </>
        )}

        {/* App Info */}
        <View className="mt-auto items-center pt-8">
          <Text
            className="text-sm text-accent"
            style={{ fontFamily: "LeckerliOne" }}
          >
            FolioNote
          </Text>
          <Text
            className="text-xs text-muted"
            style={{ fontFamily: "LeckerliOne" }}
          >
            v{Constants.expoConfig?.version}
          </Text>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Dialog */}
      <Dialog isOpen={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-5 gap-1.5">
              <View className="mb-2 flex-row items-center gap-2">
                <HugeiconsIcon
                  color={dangerColor}
                  icon={Logout03Icon}
                  size={20}
                />
                <Dialog.Title>{t("profile.signOutConfirmTitle")}</Dialog.Title>
              </View>
              <Dialog.Description>
                {t("profile.signOutConfirmDescription")}
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end gap-3">
              <Button
                onPress={() => setSignOutDialogOpen(false)}
                size="sm"
                variant="ghost"
              >
                <Text className="text-foreground">{t("common.cancel")}</Text>
              </Button>
              <Button
                className="bg-danger"
                onPress={handleSignOutConfirm}
                size="sm"
              >
                <Text className="text-white">{t("auth.signOut")}</Text>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {/* Language Selection BottomSheet */}
      <BottomSheet
        isOpen={languageModalVisible}
        onOpenChange={setLanguageModalVisible}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content>
            <BottomSheet.Title className="mb-4 text-center text-lg font-semibold">
              {t("common.language")}
            </BottomSheet.Title>

            <View className="gap-1">
              {supportedLanguages.map((lang) => (
                <PressableFeedback
                  className={cn(
                    "flex-row items-center justify-between rounded-xl px-4 py-3",
                    currentLanguage === lang ? "bg-accent" : "bg-transparent"
                  )}
                  key={lang}
                  onPress={() => handleLanguageChange(lang)}
                >
                  <PressableFeedback.Highlight />
                  <Text
                    className={cn(
                      "text-base text-foreground",
                      currentLanguage === lang
                        ? "font-medium text-accent-foreground"
                        : "font-normal text-foreground"
                    )}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {currentLanguage === lang && (
                    <HugeiconsIcon
                      color={accentForegroundColor}
                      icon={Tick02Icon}
                      size={24}
                      strokeWidth={2.5}
                    />
                  )}
                </PressableFeedback>
              ))}
            </View>

            <View className="mt-4 gap-3">
              <PressableFeedback
                className="items-center rounded-xl bg-muted/20 py-3"
                onPress={() => setLanguageModalVisible(false)}
              >
                <PressableFeedback.Highlight />
                <Text className="font-medium text-foreground">
                  {t("common.close")}
                </Text>
              </PressableFeedback>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </Container>
  )
}

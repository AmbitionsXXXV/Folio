import { formatDate } from "@folionote/locales"
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput
} from "@gorhom/bottom-sheet"
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet"
import {
  Cancel01Icon,
  Copy01Icon,
  Delete02Icon,
  EyeIcon,
  Link01Icon,
  LockPasswordIcon,
  Share01Icon,
  Tick02Icon,
  TimeSetting01Icon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react-native"
import { useMutation, useQuery } from "@tanstack/react-query"
import * as Clipboard from "expo-clipboard"
import { useThemeColor } from "heroui-native"
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react"
import { useTranslation } from "react-i18next"
import { Alert, Pressable, Share, Text, View } from "react-native"

import { client, orpc, queryClient } from "@/utils/orpc"

interface ShareSheetProps {
  entryId: string
  entryTitle: string
}

export interface ShareSheetRef {
  open: () => void
  close: () => void
}

interface ShareInfo {
  id: string
  shareToken: string
  hasPassword: boolean
  expiresAt: string | null
  showBranding: boolean
  isActive: boolean
  viewCount: number
  lastViewedAt: string | null
  createdAt: string
}

/**
 * Expiration preset options
 */
const EXPIRATION_PRESETS = [
  { value: "never", labelKey: "share.neverExpire" },
  { value: "1h", labelKey: "share.expire1Hour" },
  { value: "1d", labelKey: "share.expire1Day" },
  { value: "7d", labelKey: "share.expire7Days" },
  { value: "30d", labelKey: "share.expire30Days" }
] as const

/**
 * Calculate expiration date from preset
 */
function getExpirationDate(preset: string): string | undefined {
  if (preset === "never") {
    return undefined
  }

  const now = new Date()
  switch (preset) {
    case "1h": {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    }
    case "1d": {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
    case "7d": {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    case "30d": {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    default: {
      return undefined
    }
  }
}

/**
 * Generate share URL from token
 */
function getShareUrl(shareToken: string): string {
  // Use the web app URL for sharing
  const baseUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://folionote.app"
  return `${baseUrl}/share/${shareToken}`
}

/**
 * ShareSheet component for managing entry share links on Native
 */
export const ShareSheet = forwardRef<ShareSheetRef, ShareSheetProps>(
  ({ entryId, entryTitle }, ref) => {
    const { t, i18n } = useTranslation()
    const bottomSheetRef = useRef<BottomSheet>(null)

    // Theme colors
    const foregroundColor = useThemeColor("foreground")
    const mutedColor = useThemeColor("muted")
    const accentColor = useThemeColor("accent")
    const surfaceColor = useThemeColor("surface")
    const dangerColor = useThemeColor("danger")

    // Form state
    const [password, setPassword] = useState("")
    const [usePassword, setUsePassword] = useState(false)
    const [expirationPreset, setExpirationPreset] = useState("never")
    const [showBranding, setShowBranding] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Snap points
    const snapPoints = useMemo(() => ["50%", "80%"], [])

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close()
    }))

    // Fetch existing shares
    const { data: shares } = useQuery(
      orpc.shares.getByEntry.queryOptions({ input: { entryId } })
    )

    // Create share mutation
    const createShareMutation = useMutation({
      mutationFn: (data: {
        entryId: string
        password?: string
        expiresAt?: string
        showBranding: boolean
      }) => client.shares.create(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["shares", "getByEntry"]] })
        Alert.alert(t("share.success"), t("share.linkCreated"))
        // Reset form
        setPassword("")
        setUsePassword(false)
        setExpirationPreset("never")
      },
      onError: () => {
        Alert.alert(t("common.error"), t("share.createError"))
      }
    })

    // Delete share mutation
    const deleteShareMutation = useMutation({
      mutationFn: (id: string) => client.shares.delete({ id }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["shares", "getByEntry"]] })
      },
      onError: () => {
        Alert.alert(t("common.error"), t("share.deleteError"))
      }
    })

    // Handle create share
    const handleCreateShare = useCallback(() => {
      createShareMutation.mutate({
        entryId,
        password: usePassword && password.length >= 4 ? password : undefined,
        expiresAt: getExpirationDate(expirationPreset),
        showBranding
      })
    }, [
      createShareMutation,
      entryId,
      password,
      usePassword,
      expirationPreset,
      showBranding
    ])

    // Handle copy link
    const handleCopyLink = useCallback(async (share: ShareInfo) => {
      const url = getShareUrl(share.shareToken)
      await Clipboard.setStringAsync(url)
      setCopiedId(share.id)
      setTimeout(() => setCopiedId(null), 2000)
    }, [])

    // Handle native share
    const handleNativeShare = useCallback(
      async (share: ShareInfo) => {
        const url = getShareUrl(share.shareToken)
        const title = entryTitle || t("entry.untitled")
        try {
          await Share.share({
            message: `${t("share.checkOut")} "${title}": ${url}`,
            url // iOS only
          })
        } catch {
          // User cancelled or error
        }
      },
      [entryTitle, t]
    )

    // Handle delete share
    const handleDeleteShare = useCallback(
      (share: ShareInfo) => {
        Alert.alert(t("share.deleteLink"), t("share.deleteConfirm"), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => deleteShareMutation.mutate(share.id)
          }
        ])
      },
      [deleteShareMutation, t]
    )

    // Format date
    const formatDateStr = useCallback(
      (dateStr: string) =>
        formatDate(dateStr, { locale: i18n.language, preset: "shortTime" }),
      [i18n.language]
    )

    // Check if expired
    const isExpired = useCallback((expiresAt: string | null) => {
      if (!expiresAt) {
        return false
      }
      return new Date(expiresAt) < new Date()
    }, [])

    // Render backdrop
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
        />
      ),
      []
    )

    return (
      <BottomSheet
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: surfaceColor }}
        enablePanDownToClose
        handleIndicatorStyle={{ backgroundColor: mutedColor }}
        index={-1}
        ref={bottomSheetRef}
        snapPoints={snapPoints}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 16 }}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <HugeiconsIcon
                color={foregroundColor}
                icon={Share01Icon}
                size={24}
              />
              <Text className="text-lg font-semibold text-foreground">
                {t("share.title")}
              </Text>
            </View>
            <Pressable onPress={() => bottomSheetRef.current?.close()}>
              <HugeiconsIcon color={mutedColor} icon={Cancel01Icon} size={24} />
            </Pressable>
          </View>

          {/* Existing shares */}
          {shares && shares.length > 0 && (
            <View className="mb-6">
              <Text className="mb-2 text-xs text-muted uppercase">
                {t("share.existingLinks")}
              </Text>
              {shares.map((share) => (
                <View
                  className="mb-2 rounded-lg border border-border bg-surface p-3"
                  key={share.id}
                  style={{
                    opacity:
                      share.isActive && !isExpired(share.expiresAt) ? 1 : 0.5
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <HugeiconsIcon
                          color={mutedColor}
                          icon={Link01Icon}
                          size={16}
                        />
                        <Text className="font-mono text-xs text-foreground">
                          {share.shareToken.slice(0, 8)}...
                        </Text>
                        {share.hasPassword && (
                          <HugeiconsIcon
                            color={mutedColor}
                            icon={LockPasswordIcon}
                            size={16}
                          />
                        )}
                        {isExpired(share.expiresAt) && (
                          <Text className="text-xs text-danger">
                            {t("share.expired")}
                          </Text>
                        )}
                      </View>
                      <View className="mt-1 flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <HugeiconsIcon
                            color={mutedColor}
                            icon={EyeIcon}
                            size={12}
                          />
                          <Text className="text-xs text-muted">
                            {share.viewCount}
                          </Text>
                        </View>
                        {share.expiresAt && !isExpired(share.expiresAt) && (
                          <View className="flex-row items-center gap-1">
                            <HugeiconsIcon
                              color={mutedColor}
                              icon={TimeSetting01Icon}
                              size={12}
                            />
                            <Text className="text-xs text-muted">
                              {formatDateStr(share.expiresAt)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Pressable
                        className="p-2"
                        onPress={() => handleCopyLink(share)}
                      >
                        <HugeiconsIcon
                          color={
                            copiedId === share.id ? accentColor : mutedColor
                          }
                          icon={copiedId === share.id ? Tick02Icon : Copy01Icon}
                          size={20}
                        />
                      </Pressable>
                      <Pressable
                        className="p-2"
                        onPress={() => handleNativeShare(share)}
                      >
                        <HugeiconsIcon
                          color={mutedColor}
                          icon={Share01Icon}
                          size={20}
                        />
                      </Pressable>
                      <Pressable
                        className="p-2"
                        onPress={() => handleDeleteShare(share)}
                      >
                        <HugeiconsIcon
                          color={dangerColor}
                          icon={Delete02Icon}
                          size={20}
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Create new share */}
          <View className="border-t border-border pt-4">
            <Text className="mb-4 text-xs text-muted uppercase">
              {t("share.createNew")}
            </Text>

            {/* Password toggle */}
            <Pressable
              className="mb-3 flex-row items-center justify-between rounded-lg bg-surface p-3"
              onPress={() => setUsePassword((prev) => !prev)}
            >
              <Text className="text-foreground">
                {t("share.passwordProtection")}
              </Text>
              <View
                className="size-6 items-center justify-center rounded-md border"
                style={{
                  backgroundColor: usePassword ? accentColor : "transparent",
                  borderColor: usePassword ? accentColor : mutedColor
                }}
              >
                {usePassword && (
                  <HugeiconsIcon color="white" icon={Tick02Icon} size={16} />
                )}
              </View>
            </Pressable>

            {usePassword && (
              <BottomSheetTextInput
                autoCapitalize="none"
                className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
                onChangeText={setPassword}
                placeholder={t("share.passwordPlaceholder")}
                placeholderTextColor={mutedColor}
                secureTextEntry
                value={password}
              />
            )}

            {/* Expiration */}
            <Text className="mb-2 text-sm text-foreground">
              {t("share.expiration")}
            </Text>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {EXPIRATION_PRESETS.map((preset) => (
                <Pressable
                  className="rounded-lg px-3 py-2"
                  key={preset.value}
                  onPress={() => setExpirationPreset(preset.value)}
                  style={{
                    backgroundColor:
                      expirationPreset === preset.value
                        ? accentColor
                        : surfaceColor
                  }}
                >
                  <Text
                    className="text-sm"
                    style={{
                      color:
                        expirationPreset === preset.value
                          ? "white"
                          : foregroundColor
                    }}
                  >
                    {t(preset.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Show branding toggle */}
            <Pressable
              className="mb-4 flex-row items-center justify-between rounded-lg bg-surface p-3"
              onPress={() => setShowBranding((prev) => !prev)}
            >
              <Text className="text-foreground">{t("share.showBranding")}</Text>
              <View
                className="size-6 items-center justify-center rounded-md border"
                style={{
                  backgroundColor: showBranding ? accentColor : "transparent",
                  borderColor: showBranding ? accentColor : mutedColor
                }}
              >
                {showBranding && (
                  <HugeiconsIcon color="white" icon={Tick02Icon} size={16} />
                )}
              </View>
            </Pressable>

            {/* Create button */}
            <Pressable
              className="items-center rounded-lg py-3"
              disabled={
                createShareMutation.isPending ||
                (usePassword && password.length < 4)
              }
              onPress={handleCreateShare}
              style={{
                backgroundColor: accentColor,
                opacity:
                  createShareMutation.isPending ||
                  (usePassword && password.length < 4)
                    ? 0.5
                    : 1
              }}
            >
              <View className="flex-row items-center gap-2">
                <HugeiconsIcon color="white" icon={Link01Icon} size={20} />
                <Text className="font-semibold text-white">
                  {t("share.createLink")}
                </Text>
              </View>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    )
  }
)

ShareSheet.displayName = "ShareSheet"

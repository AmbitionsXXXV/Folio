import {
  Button,
  Checkbox,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  Tooltip
} from "@heroui/react"
import {
  Copy01Icon,
  Delete02Icon,
  EyeIcon,
  Link01Icon,
  LockPasswordIcon,
  Share01Icon,
  Tick02Icon,
  TimeSetting01Icon
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { orpc } from "@/utils/orpc"

import { ConfirmDeleteDialog } from "./confirm-delete-dialog"

interface ShareDialogProps {
  entryId: string
  entryTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
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
  { value: "never", label: "share.neverExpire" },
  { value: "1h", label: "share.expire1Hour" },
  { value: "1d", label: "share.expire1Day" },
  { value: "7d", label: "share.expire7Days" },
  { value: "30d", label: "share.expire30Days" }
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
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  return `${baseUrl}/share/${shareToken}`
}

/**
 * ShareDialog component for managing entry share links
 */
export function ShareDialog({
  entryId,
  entryTitle,
  open,
  onOpenChange
}: ShareDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Form state for creating new share
  const [password, setPassword] = useState("")
  const [usePassword, setUsePassword] = useState(false)
  const [expirationPreset, setExpirationPreset] = useState("never")
  const [showBranding, setShowBranding] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [shareToDelete, setShareToDelete] = useState<string | null>(null)

  // Fetch existing shares for this entry
  const { data: shares } = useQuery({
    queryKey: ["shares", entryId],
    queryFn: () => orpc.shares.getByEntry.call({ entryId }),
    enabled: open
  })

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: (data: {
      entryId: string
      password?: string
      expiresAt?: string
      showBranding: boolean
    }) => orpc.shares.create.call(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", entryId] })
      toast.success(t("share.linkCreated"))
      // Reset form
      setPassword("")
      setUsePassword(false)
      setExpirationPreset("never")
    },
    onError: () => {
      toast.error(t("share.createError"))
    }
  })

  // Delete share mutation
  const deleteShareMutation = useMutation({
    mutationFn: (id: string) => orpc.shares.delete.call({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", entryId] })
      toast.success(t("share.linkDeleted"))
      setShareToDelete(null)
    },
    onError: () => {
      toast.error(t("share.deleteError"))
    }
  })

  // Handle delete share with confirmation
  const handleDeleteShare = useCallback((shareId: string) => {
    setShareToDelete(shareId)
  }, [])

  const handleConfirmDeleteShare = useCallback(() => {
    if (shareToDelete) {
      deleteShareMutation.mutate(shareToDelete)
    }
  }, [shareToDelete, deleteShareMutation])

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
  const handleCopyLink = useCallback(
    async (share: ShareInfo) => {
      const url = getShareUrl(share.shareToken)
      try {
        await navigator.clipboard.writeText(url)
        setCopiedId(share.id)
        toast.success(t("share.copied"))
        setTimeout(() => setCopiedId(null), 2000)
      } catch {
        toast.error(t("share.copyError"))
      }
    },
    [t]
  )

  // Format date for display
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)
  }, [])

  // Check if share is expired
  const isExpired = useCallback((expiresAt: string | null) => {
    if (!expiresAt) {
      return false
    }
    return new Date(expiresAt) < new Date()
  }, [])

  return (
    <>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <HugeiconsIcon className="size-5" icon={Share01Icon} />
                {t("share.title")}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  {t("share.description", {
                    title: entryTitle || t("entry.untitled")
                  })}
                </p>

                {/* Existing shares */}
                {shares && shares.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted uppercase">
                      {t("share.existingLinks")}
                    </p>
                    <div className="space-y-2">
                      {shares.map((share) => (
                        <div
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3",
                            !share.isActive && "opacity-50",
                            isExpired(share.expiresAt) && "border-danger/50"
                          )}
                          key={share.id}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                className="size-4 text-muted"
                                icon={Link01Icon}
                              />
                              <code className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-xs">
                                {share.shareToken.slice(0, 8)}...
                              </code>
                              {share.hasPassword && (
                                <span title={t("share.passwordProtected")}>
                                  <HugeiconsIcon
                                    className="size-4 text-muted"
                                    icon={LockPasswordIcon}
                                  />
                                </span>
                              )}
                              {isExpired(share.expiresAt) && (
                                <span className="text-xs text-danger">
                                  {t("share.expired")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted">
                              <span className="flex items-center gap-1">
                                <HugeiconsIcon
                                  className="size-3"
                                  icon={EyeIcon}
                                />
                                {share.viewCount} {t("share.views")}
                              </span>
                              {share.expiresAt &&
                                !isExpired(share.expiresAt) && (
                                  <span className="flex items-center gap-1">
                                    <HugeiconsIcon
                                      className="size-3"
                                      icon={TimeSetting01Icon}
                                    />
                                    {formatDate(share.expiresAt)}
                                  </span>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <Button
                                isIconOnly
                                onPress={() => handleCopyLink(share)}
                                size="sm"
                                variant="ghost"
                              >
                                <HugeiconsIcon
                                  className="size-4"
                                  icon={
                                    copiedId === share.id
                                      ? Tick02Icon
                                      : Copy01Icon
                                  }
                                />
                              </Button>
                              <Tooltip.Content>
                                {t("share.copyLink")}
                              </Tooltip.Content>
                            </Tooltip>
                            <Tooltip>
                              <Button
                                isDisabled={deleteShareMutation.isPending}
                                isIconOnly
                                onPress={() => handleDeleteShare(share.id)}
                                size="sm"
                                variant="ghost"
                              >
                                <HugeiconsIcon
                                  className="size-4 text-danger"
                                  icon={Delete02Icon}
                                />
                              </Button>
                              <Tooltip.Content>
                                {t("share.deleteLink")}
                              </Tooltip.Content>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create new share form */}
                <div className="space-y-4 border-t pt-4">
                  <p className="text-xs text-muted uppercase">
                    {t("share.createNew")}
                  </p>

                  {/* Password protection */}
                  <div className="space-y-2">
                    <Checkbox
                      id="use-password"
                      isSelected={usePassword}
                      onChange={setUsePassword}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label
                          className="cursor-pointer"
                          htmlFor="use-password"
                        >
                          {t("share.passwordProtection")}
                        </Label>
                      </Checkbox.Content>
                    </Checkbox>
                    {usePassword && (
                      <TextField
                        aria-label={t("share.passwordPlaceholder")}
                        className="mt-2"
                        minLength={4}
                        onChange={setPassword}
                        type="password"
                        value={password}
                      >
                        <Input placeholder={t("share.passwordPlaceholder")} />
                      </TextField>
                    )}
                  </div>

                  {/* Expiration */}
                  <Select
                    onChange={(value) => {
                      if (value) {
                        setExpirationPreset(String(value))
                      }
                    }}
                    value={expirationPreset}
                    variant="secondary"
                  >
                    <Label>{t("share.expiration")}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {EXPIRATION_PRESETS.map((preset) => (
                          <ListBox.Item
                            id={preset.value}
                            key={preset.value}
                            textValue={t(preset.label)}
                          >
                            {t(preset.label)}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  {/* Show branding */}
                  <Checkbox
                    id="show-branding"
                    isSelected={showBranding}
                    onChange={setShowBranding}
                  >
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <Label className="cursor-pointer" htmlFor="show-branding">
                        {t("share.showBranding")}
                      </Label>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button onPress={() => onOpenChange(false)} variant="outline">
                {t("common.cancel")}
              </Button>
              <Button
                isDisabled={
                  createShareMutation.isPending ||
                  (usePassword && password.length < 4)
                }
                onPress={handleCreateShare}
              >
                <HugeiconsIcon className="size-4" icon={Link01Icon} />
                {t("share.createLink")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <ConfirmDeleteDialog
        confirmText={t("share.deleteLink")}
        description={t("share.deleteConfirm")}
        isLoading={deleteShareMutation.isPending}
        onConfirm={handleConfirmDeleteShare}
        onOpenChange={(value) => !value && setShareToDelete(null)}
        open={!!shareToDelete}
        title={t("share.deleteLink")}
      />
    </>
  )
}

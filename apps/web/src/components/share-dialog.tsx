import { Button } from "@folionote/ui/button"
import { Checkbox } from "@folionote/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@folionote/ui/dialog"
import { Input } from "@folionote/ui/input"
import { Label } from "@folionote/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@folionote/ui/select"
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
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon className="size-5" icon={Share01Icon} />
              {t("share.title")}
            </DialogTitle>
            <DialogDescription>
              {t("share.description", {
                title: entryTitle || t("entry.untitled")
              })}
            </DialogDescription>
          </DialogHeader>

          {/* Existing shares */}
          {shares && shares.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase">
                {t("share.existingLinks")}
              </Label>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      !share.isActive && "opacity-50",
                      isExpired(share.expiresAt) && "border-destructive/50"
                    )}
                    key={share.id}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          className="size-4 text-muted-foreground"
                          icon={Link01Icon}
                        />
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {share.shareToken.slice(0, 8)}...
                        </code>
                        {share.hasPassword && (
                          <span title={t("share.passwordProtected")}>
                            <HugeiconsIcon
                              className="size-4 text-muted-foreground"
                              icon={LockPasswordIcon}
                            />
                          </span>
                        )}
                        {isExpired(share.expiresAt) && (
                          <span className="text-xs text-destructive">
                            {t("share.expired")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon className="size-3" icon={EyeIcon} />
                          {share.viewCount} {t("share.views")}
                        </span>
                        {share.expiresAt && !isExpired(share.expiresAt) && (
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
                      <Button
                        onClick={() => handleCopyLink(share)}
                        size="icon-sm"
                        title={t("share.copyLink")}
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          className="size-4"
                          icon={copiedId === share.id ? Tick02Icon : Copy01Icon}
                        />
                      </Button>
                      <Button
                        disabled={deleteShareMutation.isPending}
                        onClick={() => handleDeleteShare(share.id)}
                        size="icon-sm"
                        title={t("share.deleteLink")}
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          className="size-4 text-destructive"
                          icon={Delete02Icon}
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create new share form */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-xs text-muted-foreground uppercase">
              {t("share.createNew")}
            </Label>

            {/* Password protection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={usePassword}
                  id="use-password"
                  onCheckedChange={(checked) => setUsePassword(!!checked)}
                />
                <Label className="cursor-pointer" htmlFor="use-password">
                  {t("share.passwordProtection")}
                </Label>
              </div>
              {usePassword && (
                <Input
                  className="mt-2"
                  minLength={4}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("share.passwordPlaceholder")}
                  type="password"
                  value={password}
                />
              )}
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label htmlFor="expiration">{t("share.expiration")}</Label>
              <Select
                onValueChange={(value) => {
                  if (value) {
                    setExpirationPreset(value)
                  }
                }}
                value={expirationPreset}
              >
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {t(preset.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show branding */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={showBranding}
                id="show-branding"
                onCheckedChange={(checked) => setShowBranding(!!checked)}
              />
              <Label className="cursor-pointer" htmlFor="show-branding">
                {t("share.showBranding")}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              {t("common.cancel")}
            </Button>
            <Button
              disabled={
                createShareMutation.isPending ||
                (usePassword && password.length < 4)
              }
              onClick={handleCreateShare}
            >
              <HugeiconsIcon className="mr-2 size-4" icon={Link01Icon} />
              {t("share.createLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        confirmText={t("share.deleteLink")}
        description={t("share.deleteConfirm")}
        isLoading={deleteShareMutation.isPending}
        onConfirm={handleConfirmDeleteShare}
        onOpenChange={(open) => !open && setShareToDelete(null)}
        open={!!shareToDelete}
        title={t("share.deleteLink")}
      />
    </>
  )
}

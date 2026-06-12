import { AlertDialog, Button } from "@heroui/react"
import { useTranslation } from "react-i18next"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

/**
 * 确认删除对话框组件
 *
 * 用于在执行删除操作前显示警告提示，让用户确认操作。
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  isLoading = false
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation()

  const displayTitle = title ?? t("common.confirmDelete")
  const displayDescription = description ?? t("entry.deleteConfirmDesc")
  const displayConfirmText = confirmText ?? t("common.delete")
  const displayCancelText = cancelText ?? t("common.cancel")

  return (
    <AlertDialog.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{displayTitle}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p className="text-sm text-muted">{displayDescription}</p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button isDisabled={isLoading} slot="close" variant="tertiary">
              {displayCancelText}
            </Button>
            <Button isDisabled={isLoading} onPress={onConfirm} variant="danger">
              {isLoading ? t("common.deleting") : displayConfirmText}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}

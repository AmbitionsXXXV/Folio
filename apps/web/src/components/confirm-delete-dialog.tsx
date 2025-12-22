import { Alert01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

type ConfirmDeleteDialogProps = {
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
	isLoading = false,
}: ConfirmDeleteDialogProps) {
	const { t } = useTranslation()

	const displayTitle = title ?? t('common.confirmDelete')
	const displayDescription = description ?? t('entry.deleteConfirmDesc')
	const displayConfirmText = confirmText ?? t('common.delete')
	const displayCancelText = cancelText ?? t('common.cancel')

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
							<HugeiconsIcon
								className="size-5 text-destructive"
								icon={Alert01Icon}
							/>
						</div>
						<DialogTitle className="text-lg">{displayTitle}</DialogTitle>
					</div>
					<DialogDescription className="mt-2 pl-13">
						{displayDescription}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose disabled={isLoading} render={<Button variant="outline" />}>
						{displayCancelText}
					</DialogClose>
					<Button
						disabled={isLoading}
						onClick={() => {
							onConfirm()
						}}
						variant="destructive"
					>
						{isLoading ? t('common.deleting') : displayConfirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

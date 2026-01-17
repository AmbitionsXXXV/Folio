import { Button } from '@folionote/ui/button'
import { HoverCardTrigger } from '@folionote/ui/hover-card'
import { Attachment01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import {
	PromptInputHoverCard,
	PromptInputHoverCardContent,
} from '@/components/ai-elements/prompt-input'
import type { AttachedFile } from './types'

export type FileAttachmentProps = {
	file: AttachedFile
	onRemove?: (fileId: string) => void
}

export function FileAttachment({ file, onRemove }: FileAttachmentProps) {
	const { t } = useTranslation()
	const filename = file.filename || ''
	const isImage = file.mediaType?.startsWith('image/') && file.url
	const attachmentLabel =
		filename || (isImage ? t('knowledge.image') : t('knowledge.attachment'))

	return (
		<PromptInputHoverCard>
			<HoverCardTrigger>
				<div className="group relative flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md border border-border px-1.5 font-medium text-sm transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50">
					<div className="relative size-5 shrink-0">
						<div className="absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-background transition-opacity group-hover:opacity-0">
							{isImage ? (
								<img
									alt={filename || 'attachment'}
									className="size-5 object-cover"
									height={20}
									src={file.url}
									width={20}
								/>
							) : (
								<div className="flex size-5 items-center justify-center text-muted-foreground">
									<HugeiconsIcon icon={Attachment01Icon} size={12} />
								</div>
							)}
						</div>
						{onRemove && (
							<Button
								aria-label={t('knowledge.removeAttachment')}
								className="absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5"
								onClick={(e) => {
									e.stopPropagation()
									onRemove(file.id)
								}}
								size="icon"
								type="button"
								variant="ghost"
							>
								<HugeiconsIcon icon={Cancel01Icon} />
								<span className="sr-only">{t('knowledge.removeAttachment')}</span>
							</Button>
						)}
					</div>
					<span className="max-w-[150px] flex-1 truncate">{attachmentLabel}</span>
				</div>
			</HoverCardTrigger>
			<PromptInputHoverCardContent className="w-auto p-2">
				<div className="w-auto space-y-3">
					{isImage && (
						<div className="flex max-h-96 w-96 items-center justify-center overflow-hidden rounded-md border">
							<img
								alt={filename || 'attachment preview'}
								className="max-h-full max-w-full object-contain"
								height={384}
								src={file.url}
								width={448}
							/>
						</div>
					)}
					<div className="flex items-center gap-2.5">
						<div className="min-w-0 flex-1 space-y-1 px-0.5">
							<h4 className="truncate font-semibold text-sm leading-none">
								{attachmentLabel}
							</h4>
							{file.mediaType && (
								<p className="truncate font-mono text-muted-foreground text-xs">
									{file.mediaType}
								</p>
							)}
						</div>
					</div>
				</div>
			</PromptInputHoverCardContent>
		</PromptInputHoverCard>
	)
}

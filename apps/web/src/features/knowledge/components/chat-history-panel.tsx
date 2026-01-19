import { Button } from '@folionote/ui/button'
import { Skeleton } from '@folionote/ui/skeleton'
import {
	Delete02Icon,
	MessageAdd01Icon,
	MessageMultiple01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { formatDistanceToNow } from 'date-fns'
import { type JSX, memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ChatSessionSummary } from '../types'

// =============================================================================
// Types
// =============================================================================

type ChatHistoryPanelProps = {
	/** List of chat sessions */
	sessions: ChatSessionSummary[]
	/** Currently selected chat ID */
	selectedChatId: string | null
	/** Loading state */
	isLoading: boolean
	/** Called when a chat is selected */
	onSelectChat: (chatId: string) => void
	/** Called when new chat button is clicked */
	onNewChat: () => void
	/** Called when a chat should be deleted */
	onDeleteChat: (chatId: string) => void
	/** Optional class name */
	className?: string
}

// =============================================================================
// Chat Item Component
// =============================================================================

type ChatItemProps = {
	session: ChatSessionSummary
	isSelected: boolean
	onSelect: () => void
	onDelete: () => void
}

const ChatItem = memo(function ChatItem({
	session,
	isSelected,
	onSelect,
	onDelete,
}: ChatItemProps) {
	const { t } = useTranslation()
	const [isHovered, setIsHovered] = useState(false)

	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation()
			onDelete()
		},
		[onDelete]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				onSelect()
			} else if (e.key === 'Delete' || e.key === 'Backspace') {
				e.preventDefault()
				onDelete()
			}
		},
		[onSelect, onDelete]
	)

	// Format the time
	const timeAgo = session.lastOpenedAt
		? formatDistanceToNow(new Date(session.lastOpenedAt), { addSuffix: true })
		: ''

	// Display title or fallback
	const displayTitle = session.title || t('knowledge.untitledChat')

	return (
		<div
			aria-selected={isSelected}
			className={cn(
				'group relative flex cursor-pointer flex-col gap-1 rounded-lg px-3 py-2',
				'transition-colors duration-150',
				'hover:bg-muted/60',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				isSelected && 'bg-muted'
			)}
			onClick={onSelect}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			role="option"
			tabIndex={0}
		>
			{/* Title row */}
			<div className="flex items-center gap-2">
				<HugeiconsIcon
					className="size-4 shrink-0 text-muted-foreground"
					icon={MessageMultiple01Icon}
				/>
				<span
					className={cn(
						'flex-1 truncate font-medium text-sm',
						isSelected && 'text-foreground'
					)}
				>
					{displayTitle}
				</span>

				{/* Delete button (visible on hover) */}
				{(isHovered || isSelected) && (
					<Button
						aria-label={t('knowledge.deleteChat')}
						className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
						onClick={handleDelete}
						size="icon"
						variant="ghost"
					>
						<HugeiconsIcon className="size-3.5" icon={Delete02Icon} />
					</Button>
				)}
			</div>

			{/* Preview row */}
			{session.lastMessagePreview && (
				<p className="truncate pl-6 text-muted-foreground text-xs">
					{session.lastMessagePreview}
				</p>
			)}

			{/* Metadata row */}
			<div className="flex items-center gap-2 pl-6 text-[10px] text-muted-foreground/70">
				<span className="font-[tabular-nums]">
					{session.messageCount} {t('knowledge.messages')}
				</span>
				{timeAgo && (
					<>
						<span>•</span>
						<span>{timeAgo}</span>
					</>
				)}
			</div>
		</div>
	)
})

// =============================================================================
// Loading Skeleton
// =============================================================================

function ChatItemSkeleton() {
	return (
		<div className="flex flex-col gap-2 px-3 py-2">
			<div className="flex items-center gap-2">
				<Skeleton className="size-4 rounded" />
				<Skeleton className="h-4 flex-1" />
			</div>
			<Skeleton className="ml-6 h-3 w-3/4" />
			<Skeleton className="ml-6 h-2 w-1/2" />
		</div>
	)
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ onNewChat }: { onNewChat: () => void }) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
			<HugeiconsIcon
				className="size-10 text-muted-foreground/40"
				icon={MessageMultiple01Icon}
			/>
			<div className="space-y-1">
				<p className="font-medium text-muted-foreground text-sm">
					{t('knowledge.noChats')}
				</p>
				<p className="text-muted-foreground/70 text-xs">
					{t('knowledge.startNewChatDescription')}
				</p>
			</div>
			<Button onClick={onNewChat} size="sm" variant="outline">
				<HugeiconsIcon className="mr-2 size-4" icon={MessageAdd01Icon} />
				{t('knowledge.newChat')}
			</Button>
		</div>
	)
}

// =============================================================================
// Main Component
// =============================================================================

export const ChatHistoryPanel = memo(function ChatHistoryPanel({
	sessions,
	selectedChatId,
	isLoading,
	onSelectChat,
	onNewChat,
	onDeleteChat,
	className,
}: ChatHistoryPanelProps) {
	const { t } = useTranslation()
	let chatListContent: JSX.Element

	if (isLoading) {
		chatListContent = (
			<div className="space-y-2">
				<ChatItemSkeleton />
				<ChatItemSkeleton />
				<ChatItemSkeleton />
			</div>
		)
	} else if (sessions.length === 0) {
		chatListContent = <EmptyState onNewChat={onNewChat} />
	} else {
		chatListContent = (
			<div className="space-y-1">
				{sessions.map((session) => (
					<ChatItem
						isSelected={session.chatId === selectedChatId}
						key={session.chatId}
						onDelete={() => onDeleteChat(session.chatId)}
						onSelect={() => onSelectChat(session.chatId)}
						session={session}
					/>
				))}
			</div>
		)
	}

	return (
		<div className={cn('flex h-full flex-col border-r bg-background', className)}>
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-3">
				<h2 className="font-semibold text-sm">{t('knowledge.chatHistory')}</h2>
				<Button
					aria-label={t('knowledge.newChat')}
					onClick={onNewChat}
					size="icon"
					variant="ghost"
				>
					<HugeiconsIcon className="size-4" icon={MessageAdd01Icon} />
				</Button>
			</div>

			{/* Chat list */}
			<div
				aria-label={t('knowledge.chatHistory')}
				className="flex-1 overflow-y-auto p-2"
				role="listbox"
			>
				{chatListContent}
			</div>
		</div>
	)
})

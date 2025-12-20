import { Delete02Icon, Edit02Icon, Link04Icon } from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'

type SourceCardProps = {
	id: string
	title: string
	type: string
	typeLabel: string
	icon: IconSvgElement
	url?: string | null
	author?: string | null
	publishedAt?: Date | string | null
	updatedAt: Date | string
	onEdit?: () => void
	onDelete?: () => void
}

export function SourceCard({
	title,
	typeLabel,
	icon,
	url,
	author,
	publishedAt,
	updatedAt,
	onEdit,
	onDelete,
}: SourceCardProps) {
	const formattedDate = new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(new Date(updatedAt))

	const formattedPublishedAt = publishedAt
		? new Intl.DateTimeFormat('zh-CN', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			}).format(new Date(publishedAt))
		: null

	return (
		<Card className="group relative transition-all hover:shadow-md">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2">
						<div className="rounded bg-primary/10 p-1.5">
							<HugeiconsIcon className="size-4 text-primary" icon={icon} />
						</div>
						<Badge variant="secondary">{typeLabel}</Badge>
					</div>
					<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						{onEdit ? (
							<Button
								className="h-7 w-7"
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									onEdit()
								}}
								size="icon"
								variant="ghost"
							>
								<HugeiconsIcon className="size-3.5" icon={Edit02Icon} />
							</Button>
						) : null}
						{onDelete ? (
							<Button
								className="h-7 w-7 text-destructive hover:text-destructive"
								onClick={(e) => {
									e.preventDefault()
									e.stopPropagation()
									onDelete()
								}}
								size="icon"
								variant="ghost"
							>
								<HugeiconsIcon className="size-3.5" icon={Delete02Icon} />
							</Button>
						) : null}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<h3 className="mb-2 line-clamp-2 font-medium text-foreground">{title}</h3>
				{author ? (
					<p className="mb-1 text-muted-foreground text-sm">作者: {author}</p>
				) : null}
				{formattedPublishedAt ? (
					<p className="mb-1 text-muted-foreground text-sm">
						发布于: {formattedPublishedAt}
					</p>
				) : null}
				{url ? (
					<a
						className="mb-2 flex items-center gap-1 text-primary text-sm hover:underline"
						href={url}
						onClick={(e) => e.stopPropagation()}
						rel="noopener noreferrer"
						target="_blank"
					>
						<HugeiconsIcon className="size-3" icon={Link04Icon} />
						<span className="line-clamp-1">{new URL(url).hostname}</span>
					</a>
				) : null}
				<p className="text-muted-foreground text-xs">更新于 {formattedDate}</p>
			</CardContent>
		</Card>
	)
}

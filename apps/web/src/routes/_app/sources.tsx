import { Button } from '@folionote/ui/button'
import { Skeleton } from '@folionote/ui/skeleton'
import {
	Add01Icon,
	Book02Icon,
	Link01Icon,
	MusicNote01Icon,
	News01Icon,
	Pdf01Icon,
	Video01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { SourceCard } from '@/components/source-card'
import { SourceDialog } from '@/components/source-dialog'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

type SourceType = 'link' | 'pdf' | 'book' | 'article' | 'video' | 'podcast' | 'other'

type FilterType = SourceType | 'all'

type SourceItem = {
	id: string
	type: string
	title: string
	url?: string | null
	author?: string | null
	publishedAt?: Date | string | null
	updatedAt: Date | string
	metadata?: string | null
	[key: string]: unknown
}

const SOURCE_TYPE_CONFIG: Record<
	SourceType,
	{ labelKey: string; icon: IconSvgElement }
> = {
	link: { labelKey: 'source.link', icon: Link01Icon },
	pdf: { labelKey: 'source.pdf', icon: Pdf01Icon },
	book: { labelKey: 'source.book', icon: Book02Icon },
	article: { labelKey: 'source.article', icon: News01Icon },
	video: { labelKey: 'source.video', icon: Video01Icon },
	podcast: { labelKey: 'source.podcast', icon: MusicNote01Icon },
	other: { labelKey: 'source.other', icon: Link01Icon },
}

export const Route = createFileRoute('/_app/sources')({
	loader: ({ context: { queryClient } }) => {
		queryClient.ensureInfiniteQueryData({
			queryKey: ['sources', 'infinite', 'all'],
			queryFn: () => orpc.sources.list.call({ type: undefined, limit: 20 }),
			initialPageParam: undefined as string | undefined,
		})
	},
	component: SourcesPage,
})

function SourcesPage() {
	const { t } = useTranslation()
	const [filter, setFilter] = useState<FilterType>('all')
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [editingSource, setEditingSource] = useState<{
		id: string
		type: SourceType
		title: string
		url?: string | null
		author?: string | null
		publishedAt?: Date | null
		metadata?: string | null
	} | null>(null)
	const [deleteTarget, setDeleteTarget] = useState<{
		id: string
		title: string
	} | null>(null)

	const queryClient = useQueryClient()

	const {
		data,
		isLoading,
		isError,
		error,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
		refetch,
	} = useInfiniteQuery({
		queryKey: ['sources', 'infinite', filter],
		queryFn: ({ pageParam }) =>
			orpc.sources.list.call({
				type: filter === 'all' ? undefined : filter,
				cursor: pageParam,
				limit: 20,
			}),
		getNextPageParam: (lastPage) =>
			lastPage?.hasMore ? lastPage.nextCursor : undefined,
		initialPageParam: undefined as string | undefined,
	})

	const deleteMutation = useMutation({
		mutationFn: (id: string) => orpc.sources.delete.call({ id }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sources'] })
			toast.success(t('source.deleted'))
			setDeleteTarget(null)
		},
		onError: () => {
			toast.error(t('source.deleteFailed'))
		},
	})

	const handleDeleteClick = useCallback((source: { id: string; title: string }) => {
		setDeleteTarget(source)
	}, [])

	const handleConfirmDelete = useCallback(() => {
		if (deleteTarget) {
			deleteMutation.mutate(deleteTarget.id)
		}
	}, [deleteTarget, deleteMutation])

	const sources =
		data?.pages?.flatMap((page) => page?.items ?? []).filter(Boolean) ?? []

	const filters: { key: FilterType; labelKey: string; icon?: IconSvgElement }[] = [
		{ key: 'all', labelKey: 'review.allItems' },
		{ key: 'link', labelKey: 'source.link', icon: Link01Icon },
		{ key: 'book', labelKey: 'source.book', icon: Book02Icon },
		{ key: 'article', labelKey: 'source.article', icon: News01Icon },
		{ key: 'video', labelKey: 'source.video', icon: Video01Icon },
		{ key: 'podcast', labelKey: 'source.podcast', icon: MusicNote01Icon },
	]

	const handleEdit = (source: SourceItem) => {
		setEditingSource({
			id: source.id,
			type: source.type as SourceType,
			title: source.title,
			url: source.url as string | null | undefined,
			author: source.author as string | null | undefined,
			publishedAt: source.publishedAt
				? new Date(source.publishedAt as string | Date)
				: null,
			metadata: source.metadata as string | null | undefined,
		})
		setIsDialogOpen(true)
	}

	const handleCreate = () => {
		setEditingSource(null)
		setIsDialogOpen(true)
	}

	const handleDialogClose = () => {
		setIsDialogOpen(false)
		setEditingSource(null)
	}

	return (
		<div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
			{/* Header */}
			<header className="mb-10 flex animate-fade-in items-start justify-between gap-4 md:mb-14">
				<div>
					<div className="mb-2 flex items-center gap-2.5">
						<div className="flex size-10 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/15">
							<HugeiconsIcon className="size-5 text-primary" icon={Link01Icon} />
						</div>
						<h1 className="font-display font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
							{t('source.sources')}
						</h1>
					</div>
					<p className="text-muted-foreground text-sm">
						{sources.length > 0
							? `${String(sources.length)} ${t('source.sources').toLowerCase()}`
							: t('source.noSources')}
					</p>
				</div>

				<Button className="shrink-0" onClick={handleCreate}>
					<HugeiconsIcon className="mr-2 size-4" icon={Add01Icon} />
					{t('source.addSource')}
				</Button>
			</header>

			{/* Filter pills */}
			<nav className="mb-8 animate-fade-in delay-100">
				<div className="flex flex-wrap gap-2">
					{filters.map(({ key, labelKey, icon }) => (
						<button
							className={cn(
								'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-medium text-sm transition-all duration-200',
								filter === key
									? 'border-primary/30 bg-primary/8 text-primary shadow-sm dark:border-primary/40 dark:bg-primary/12'
									: 'border-border/50 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground'
							)}
							key={key}
							onClick={() => setFilter(key)}
							type="button"
						>
							{icon ? <HugeiconsIcon className="size-3.5" icon={icon} /> : null}
							{t(labelKey)}
						</button>
					))}
				</div>
			</nav>

			{/* Source list */}
			<SourceListContent
				error={error}
				fetchNextPage={fetchNextPage}
				handleCreate={handleCreate}
				handleDeleteClick={handleDeleteClick}
				handleEdit={handleEdit}
				hasNextPage={hasNextPage}
				isError={isError}
				isFetchingNextPage={isFetchingNextPage}
				isLoading={isLoading}
				refetch={refetch}
				sources={sources}
				t={t}
			/>

			{/* Source dialog */}
			<SourceDialog
				onClose={handleDialogClose}
				open={isDialogOpen}
				source={editingSource}
			/>

			{/* Delete confirmation dialog */}
			<ConfirmDeleteDialog
				description={t('source.deleteConfirmDesc', {
					title: deleteTarget?.title || '',
				})}
				isLoading={deleteMutation.isPending}
				onConfirm={handleConfirmDelete}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				open={!!deleteTarget}
				title={t('source.deleteConfirmTitle')}
			/>
		</div>
	)
}

type SourceListContentProps = {
	isLoading: boolean
	isError: boolean
	error: Error | null
	sources: SourceItem[]
	hasNextPage: boolean
	isFetchingNextPage: boolean
	handleCreate: () => void
	handleEdit: (source: SourceItem) => void
	handleDeleteClick: (source: { id: string; title: string }) => void
	fetchNextPage: () => void
	refetch: () => void
	t: (key: string) => string
}

function SourceListContent({
	isLoading,
	isError,
	error,
	sources,
	hasNextPage,
	isFetchingNextPage,
	handleCreate,
	handleEdit,
	handleDeleteClick,
	fetchNextPage,
	refetch,
	t,
}: SourceListContentProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton
						className={cn(
							'h-36 rounded-2xl',
							`animate-fade-in delay-${((i % 4) + 1) * 100}`
						)}
						key={`source-skel-${String(i)}`}
					/>
				))}
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex animate-fade-in flex-col items-center justify-center py-20 text-center">
				<div className="mb-4 rounded-full bg-destructive/8 p-4">
					<HugeiconsIcon className="size-8 text-destructive/50" icon={Link01Icon} />
				</div>
				<p className="mb-1 font-display font-medium text-destructive text-lg">
					{t('common.error')}
				</p>
				<p className="mb-5 max-w-sm text-muted-foreground text-sm">
					{error?.message ?? t('common.unknownError')}
				</p>
				<Button onClick={() => refetch()} variant="outline">
					{t('common.retry')}
				</Button>
			</div>
		)
	}

	if (sources.length === 0) {
		return (
			<div className="flex animate-fade-in flex-col items-center justify-center rounded-2xl border border-border/60 border-dashed py-20 text-center">
				<div className="mb-4 rounded-full bg-primary/5 p-4">
					<HugeiconsIcon className="size-8 text-primary/40" icon={Link01Icon} />
				</div>
				<p className="mb-1 font-display font-medium text-foreground/70 text-lg">
					{t('source.noSources')}
				</p>
				<p className="mb-5 max-w-sm text-muted-foreground text-sm">
					{t('source.addSource')}
				</p>
				<Button onClick={handleCreate} variant="outline">
					<HugeiconsIcon className="mr-2 size-4" icon={Add01Icon} />
					{t('source.newSource')}
				</Button>
			</div>
		)
	}

	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{sources.map((source, i) => (
					<div
						className={cn('animate-fade-in', i > 0 && `delay-${(i % 4) * 100}`)}
						key={source.id}
					>
						<SourceCard
							{...source}
							icon={
								SOURCE_TYPE_CONFIG[source.type as SourceType]?.icon || Link01Icon
							}
							onDelete={() =>
								handleDeleteClick({ id: source.id, title: source.title })
							}
							onEdit={() => handleEdit(source)}
							typeLabel={
								SOURCE_TYPE_CONFIG[source.type as SourceType]?.labelKey
									? t(SOURCE_TYPE_CONFIG[source.type as SourceType].labelKey)
									: t('source.other')
							}
						/>
					</div>
				))}
			</div>

			{/* Load more */}
			{hasNextPage ? (
				<div className="mt-10 flex justify-center">
					<Button
						className="min-w-[120px]"
						disabled={isFetchingNextPage}
						onClick={() => fetchNextPage()}
						variant="outline"
					>
						{isFetchingNextPage ? t('common.loading') : t('common.more')}
					</Button>
				</div>
			) : null}
		</>
	)
}

import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { EntryList } from '@/components/entry-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getUser } from '@/functions/get-user'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/search')({
	component: SearchPage,
	validateSearch: (search: Record<string, unknown>) => ({
		q: typeof search.q === 'string' ? search.q : '',
	}),
	beforeLoad: async () => {
		const session = await getUser()
		return { session }
	},
	loader: ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: '/login',
			})
		}
	},
})

function SearchPage() {
	const { q } = useSearch({ from: '/search' })
	const [searchInput, setSearchInput] = useState(q)

	const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			queryKey: ['search', 'entries', q],
			queryFn: ({ pageParam }) =>
				orpc.search.entries.call({
					query: q,
					cursor: pageParam,
					limit: 20,
				}),
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			initialPageParam: undefined as string | undefined,
			enabled: q.length > 0,
		})

	const entries = data?.pages.flatMap((page) => page.items) ?? []

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		if (searchInput.trim()) {
			window.history.pushState(
				{},
				'',
				`/search?q=${encodeURIComponent(searchInput.trim())}`
			)
			window.location.reload()
		}
	}

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			{/* Header */}
			<div className="mb-8 flex items-center gap-3">
				<div className="rounded-lg bg-primary/10 p-2">
					<HugeiconsIcon className="size-6 text-primary" icon={Search01Icon} />
				</div>
				<div>
					<h1 className="font-bold text-2xl">搜索</h1>
					<p className="text-muted-foreground text-sm">搜索笔记标题和内容</p>
				</div>
			</div>

			{/* Search form */}
			<form className="mb-8" onSubmit={handleSearch}>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<HugeiconsIcon
							className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
							icon={Search01Icon}
						/>
						<Input
							className="pl-10"
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder="输入关键词搜索..."
							type="search"
							value={searchInput}
						/>
					</div>
					<Button type="submit">搜索</Button>
				</div>
			</form>

			{/* Search results */}
			{q ? (
				<>
					<p className="mb-4 text-muted-foreground text-sm">
						{isLoading
							? '搜索中...'
							: `找到 ${entries.length}${hasNextPage ? '+' : ''} 条结果`}
					</p>
					<EntryList
						emptyMessage={`未找到包含"${q}"的笔记`}
						entries={entries}
						hasMore={hasNextPage}
						isLoading={isLoading}
						isLoadingMore={isFetchingNextPage}
						onLoadMore={() => fetchNextPage()}
					/>
				</>
			) : (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<HugeiconsIcon
						className="mb-4 size-12 text-muted-foreground/50"
						icon={Search01Icon}
					/>
					<p className="mb-2 font-medium text-muted-foreground">开始搜索</p>
					<p className="text-muted-foreground text-sm">
						输入关键词搜索笔记的标题和内容
					</p>
				</div>
			)}
		</div>
	)
}

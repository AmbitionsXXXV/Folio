import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebounce } from 'use-debounce'
import { EntryList } from '@/components/entry-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Entry } from '@/types'
import { orpc } from '@/utils/orpc'
import { ActiveFilterBadges, SearchFilters } from './search-filters'
import { SearchHistory } from './search-history'
import { SearchSuggestions } from './search-suggestions'
import type { SearchFiltersValue, SearchHistoryFilters } from './types'

export type { SearchFiltersValue } from './types'

type AdvancedSearchProps = {
	initialQuery?: string
	initialFilters?: SearchFiltersValue
	onSearch?: (query: string, filters: SearchFiltersValue) => void
	showHistory?: boolean
	showSuggestions?: boolean
	className?: string
}

// Type for the API response
type AdvancedSearchResponse = {
	items: Entry[]
	nextCursor?: string
	hasMore: boolean
	query: string
	filters: {
		tagIds?: string[]
		sourceIds?: string[]
		dateRange?: { from?: Date; to?: Date }
		isInbox?: boolean
		isStarred?: boolean
	}
	usedFts: boolean
}

export function AdvancedSearch({
	initialQuery = '',
	initialFilters = {},
	onSearch,
	showHistory = true,
	showSuggestions = true,
	className,
}: AdvancedSearchProps) {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const inputRef = useRef<HTMLInputElement>(null)

	const [query, setQuery] = useState(initialQuery)
	const [filters, setFilters] = useState<SearchFiltersValue>(initialFilters)
	const [isInputFocused, setIsInputFocused] = useState(false)
	const [debouncedQuery] = useDebounce(query, 300)

	// Determine if we should show the dropdown (history/suggestions)
	const showDropdown =
		isInputFocused && query.length === 0 && (showHistory || showSuggestions)

	// Check if any search criteria is active
	const hasSearchCriteria = Boolean(
		debouncedQuery.length > 0 ||
			(filters.tagIds && filters.tagIds.length > 0) ||
			(filters.sourceIds && filters.sourceIds.length > 0) ||
			filters.dateRange?.from ||
			filters.dateRange?.to ||
			filters.isInbox ||
			filters.isStarred
	)

	// Perform advanced search
	const {
		data,
		isLoading,
		isError,
		error,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
		refetch,
	} = useInfiniteQuery<AdvancedSearchResponse>({
		queryKey: ['search', 'advanced', debouncedQuery, filters],
		queryFn: ({ pageParam }) =>
			orpc.search.advanced.call({
				query: debouncedQuery || undefined,
				tagIds: filters.tagIds,
				sourceIds: filters.sourceIds,
				dateRange: filters.dateRange
					? {
							from: filters.dateRange.from,
							to: filters.dateRange.to,
						}
					: undefined,
				isInbox: filters.isInbox,
				isStarred: filters.isStarred,
				cursor: pageParam as string | undefined,
				limit: 20,
				saveToHistory: false, // We save manually on form submit
			}) as Promise<AdvancedSearchResponse>,
		getNextPageParam: (lastPage) => lastPage?.nextCursor,
		initialPageParam: undefined as string | undefined,
		enabled: hasSearchCriteria,
	})

	// Save search to history mutation
	const saveHistoryMutation = useMutation({
		mutationFn: (params: { query: string; resultCount: number }) =>
			orpc.search.saveHistory.call({
				query: params.query,
				filters: {
					tagIds: filters.tagIds,
					sourceIds: filters.sourceIds,
					dateRange: filters.dateRange
						? {
								from: filters.dateRange.from,
								to: filters.dateRange.to,
							}
						: undefined,
					isInbox: filters.isInbox,
					isStarred: filters.isStarred,
				},
				resultCount: params.resultCount,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['search', 'history'] })
		},
	})

	const entries =
		data?.pages?.flatMap((page) => page?.items ?? []).filter(Boolean) ?? []

	// Handle form submission
	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			setIsInputFocused(false)

			if (query.trim()) {
				// Save to history
				saveHistoryMutation.mutate({
					query: query.trim(),
					resultCount: entries.length,
				})
			}

			onSearch?.(query, filters)
		},
		[query, filters, entries.length, saveHistoryMutation, onSearch]
	)

	// Handle suggestion/history selection
	const handleSelectSuggestion = useCallback(
		(selectedQuery: string, selectedFilters?: SearchHistoryFilters | null) => {
			setQuery(selectedQuery)
			if (selectedFilters) {
				// Parse date strings back to Date objects if present
				const parsedFilters: SearchFiltersValue = {
					tagIds: selectedFilters.tagIds,
					sourceIds: selectedFilters.sourceIds,
					isInbox: selectedFilters.isInbox,
					isStarred: selectedFilters.isStarred,
					dateRange: selectedFilters.dateRange
						? {
								from: selectedFilters.dateRange.from
									? new Date(selectedFilters.dateRange.from)
									: undefined,
								to: selectedFilters.dateRange.to
									? new Date(selectedFilters.dateRange.to)
									: undefined,
							}
						: undefined,
				}
				setFilters(parsedFilters)
			}
			setIsInputFocused(false)
			inputRef.current?.blur()
		},
		[]
	)

	// Handle filter changes
	const handleFiltersChange = useCallback((newFilters: SearchFiltersValue) => {
		setFilters(newFilters)
	}, [])

	// Handle entry click - navigate to entry
	const handleEntryClick = useCallback(
		(entryId: string) => {
			navigate({ to: '/entries/$id', params: { id: entryId } })
		},
		[navigate]
	)

	// Update URL when search changes (if onSearch not provided)
	useEffect(() => {
		if (typeof window === 'undefined') return
		if (!onSearch && debouncedQuery) {
			const searchParams = new URLSearchParams()
			searchParams.set('q', debouncedQuery)
			if (filters.tagIds?.length) {
				searchParams.set('tags', filters.tagIds.join(','))
			}
			if (filters.sourceIds?.length) {
				searchParams.set('sources', filters.sourceIds.join(','))
			}
			window.history.replaceState(null, '', `?${searchParams.toString()}`)
		}
	}, [debouncedQuery, filters, onSearch])

	// Wrap entries to match Entry type with click handler
	const entriesWithClick = entries.map((entry) => ({
		...entry,
		onClick: () => handleEntryClick(entry.id),
	}))

	return (
		<div className={cn('space-y-4', className)}>
			{/* Search form */}
			<form onSubmit={handleSubmit}>
				<div className="flex gap-2">
					<div className="relative flex-1">
						<HugeiconsIcon
							className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
							icon={Search01Icon}
						/>
						<Input
							className="pl-10"
							onBlur={() => {
								// Delay to allow click on dropdown items
								setTimeout(() => setIsInputFocused(false), 200)
							}}
							onChange={(e) => setQuery(e.target.value)}
							onFocus={() => setIsInputFocused(true)}
							placeholder={t('search.placeholder')}
							ref={inputRef}
							type="search"
							value={query}
						/>

						{/* Dropdown for history and suggestions */}
						{showDropdown && (
							<div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border bg-popover p-3 shadow-md">
								{showSuggestions && (
									<SearchSuggestions
										className="mb-4"
										onSelect={(s) => handleSelectSuggestion(s)}
										query=""
									/>
								)}
								{showHistory && <SearchHistory onSelect={handleSelectSuggestion} />}
							</div>
						)}
					</div>
					<SearchFilters onChange={handleFiltersChange} value={filters} />
					<Button type="submit">{t('common.search')}</Button>
				</div>
			</form>

			{/* Active filters display */}
			<ActiveFilterBadges onChange={handleFiltersChange} value={filters} />

			{/* Search results */}
			{hasSearchCriteria ? (
				<>
					<p className="text-muted-foreground text-sm">
						{(() => {
							if (isLoading) return t('common.loading')
							if (isError) return t('common.error')
							return t('search.resultCount', { count: entries.length })
						})()}
					</p>
					<EntryList
						emptyMessage={t('search.noResults')}
						entries={entriesWithClick}
						errorMessage={
							isError ? (error?.message ?? t('common.unknownError')) : undefined
						}
						hasMore={hasNextPage}
						isLoading={isLoading}
						isLoadingMore={isFetchingNextPage}
						onLoadMore={() => fetchNextPage()}
						onRetry={refetch}
					/>
				</>
			) : (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<HugeiconsIcon
						className="mb-4 size-12 text-muted-foreground/50"
						icon={Search01Icon}
					/>
					<p className="mb-2 font-medium text-muted-foreground">
						{t('search.advanced')}
					</p>
					<p className="text-muted-foreground text-sm">{t('search.placeholder')}</p>
				</div>
			)}
		</div>
	)
}

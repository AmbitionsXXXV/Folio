import {
	BookOpen01Icon,
	FilterIcon,
	InboxIcon,
	Link01Icon,
	Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from '@/components/ui/command'
import { useCommandPalette } from '@/contexts/command-palette-context'
import { useDebounce } from '@/hooks/use-debounce'
import { orpc } from '@/utils/orpc'

export function CommandPalette() {
	const { t } = useTranslation()
	const { open, setOpen } = useCommandPalette()
	const [search, setSearch] = useState('')
	const navigate = useNavigate()

	// Debounce search query to reduce flickering
	const debouncedSearch = useDebounce(search, 300)

	// Global keyboard shortcut
	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setOpen(!open)
			}
		}

		document.addEventListener('keydown', down)
		return () => document.removeEventListener('keydown', down)
	}, [open, setOpen])

	// Clear search when dialog closes
	useEffect(() => {
		if (!open) {
			setSearch('')
		}
	}, [open])

	// Search entries when user types (with debounce and keep previous data)
	const { data: searchResults, isFetching } = useQuery({
		queryKey: ['command-search', debouncedSearch],
		queryFn: () =>
			orpc.search.entries.call({
				query: debouncedSearch,
				limit: 5,
			}),
		enabled: debouncedSearch.length > 0,
		placeholderData: keepPreviousData,
		staleTime: 1000,
	})

	// Determine loading state - only show loading when actually searching
	const isLoading = isFetching && debouncedSearch.length > 0

	const handleSelect = useCallback(
		(callback: () => void) => {
			setOpen(false)
			callback()
		},
		[setOpen]
	)

	const entries = searchResults?.items ?? []

	return (
		<CommandDialog
			description={t('commandPalette.description')}
			onOpenChange={setOpen}
			open={open}
			title={t('commandPalette.title')}
		>
			<Command shouldFilter={false}>
				<CommandInput
					onClose={() => setOpen(false)}
					onValueChange={setSearch}
					placeholder={t('commandPalette.searchPlaceholder')}
					showCloseButton={true}
					value={search}
				/>
				<CommandList className="h-[300px]">
					<CommandEmpty>
						{isLoading
							? t('commandPalette.searching')
							: t('commandPalette.noResults')}
					</CommandEmpty>

					{/* Search results */}
					{entries.length > 0 ? (
						<CommandGroup heading={t('commandPalette.entries')}>
							{entries.map((entry) => (
								<CommandItem
									key={entry.id}
									onSelect={() =>
										handleSelect(() =>
											navigate({ to: '/entries/$id', params: { id: entry.id } })
										)
									}
									value={`entry-${entry.id}`}
								>
									<HugeiconsIcon className="mr-2 size-4" icon={Search01Icon} />
									<span className="line-clamp-1">
										{entry.title || t('commandPalette.untitled')}
									</span>
								</CommandItem>
							))}
							{/* Link to advanced search with current query */}
							<CommandItem
								onSelect={() =>
									handleSelect(() =>
										navigate({ to: '/search', search: { q: search } })
									)
								}
								value="search-more"
							>
								<HugeiconsIcon className="mr-2 size-4" icon={FilterIcon} />
								<span>{t('commandPalette.advancedSearch')}</span>
							</CommandItem>
						</CommandGroup>
					) : null}

					{/* Show advanced search link when no results */}
					{search.length > 0 && entries.length === 0 && !isLoading && (
						<>
							<CommandSeparator />
							<CommandGroup>
								<CommandItem
									onSelect={() =>
										handleSelect(() =>
											navigate({ to: '/search', search: { q: search } })
										)
									}
									value="advanced-search"
								>
									<HugeiconsIcon className="mr-2 size-4" icon={FilterIcon} />
									<span>{t('commandPalette.tryAdvancedSearch')}</span>
								</CommandItem>
							</CommandGroup>
						</>
					)}

					{/* Quick navigation */}
					<CommandGroup heading={t('commandPalette.quickNavigation')}>
						<CommandItem
							onSelect={() => handleSelect(() => navigate({ to: '/inbox' }))}
							value="nav-inbox"
						>
							<HugeiconsIcon className="mr-2 size-4" icon={InboxIcon} />
							<span>{t('nav.inbox')}</span>
							<CommandShortcut>{t('nav.inbox')}</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() => handleSelect(() => navigate({ to: '/library' }))}
							value="nav-library"
						>
							<HugeiconsIcon className="mr-2 size-4" icon={BookOpen01Icon} />
							<span>{t('nav.library')}</span>
							<CommandShortcut>{t('nav.library')}</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() => handleSelect(() => navigate({ to: '/sources' }))}
							value="nav-sources"
						>
							<HugeiconsIcon className="mr-2 size-4" icon={Link01Icon} />
							<span>{t('nav.sources')}</span>
							<CommandShortcut>{t('nav.sources')}</CommandShortcut>
						</CommandItem>
						<CommandItem
							onSelect={() =>
								handleSelect(() => navigate({ to: '/search', search: { q: '' } }))
							}
							value="nav-search"
						>
							<HugeiconsIcon className="mr-2 size-4" icon={Search01Icon} />
							<span>{t('search.advanced')}</span>
							<CommandShortcut>{t('common.search')}</CommandShortcut>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</Command>
		</CommandDialog>
	)
}

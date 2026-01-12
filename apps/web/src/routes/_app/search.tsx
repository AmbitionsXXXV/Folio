import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdvancedSearch } from '@/components/search'
import type { SearchFiltersValue } from '@/components/search/search-filters'
import { searchQuerySchema } from '@/lib/search-schemas'

export const Route = createFileRoute('/_app/search')({
	component: SearchPage,
	validateSearch: searchQuerySchema,
})

function SearchPage() {
	const { t } = useTranslation()
	const { q } = useSearch({ from: '/_app/search' })

	// Parse URL params to filters - only on client side
	const [initialFilters, setInitialFilters] = useState<SearchFiltersValue>({})

	useEffect(() => {
		if (typeof window === 'undefined') return
		const params = new URLSearchParams(window.location.search)
		const tags = params.get('tags')
		const sources = params.get('sources')
		const from = params.get('from')
		const to = params.get('to')
		const isInbox = params.get('isInbox')
		const isStarred = params.get('isStarred')

		const parsedFilters: SearchFiltersValue = {}

		if (tags) {
			parsedFilters.tagIds = tags.split(',').filter(Boolean)
		}
		if (sources) {
			parsedFilters.sourceIds = sources.split(',').filter(Boolean)
		}
		if (from || to) {
			parsedFilters.dateRange = {
				from: from ? new Date(from) : undefined,
				to: to ? new Date(to) : undefined,
			}
		}
		if (isInbox === 'true') {
			parsedFilters.isInbox = true
		}
		if (isStarred === 'true') {
			parsedFilters.isStarred = true
		}

		setInitialFilters(parsedFilters)
	}, [])

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			{/* Header */}
			<div className="mb-8 flex items-center gap-3">
				<div className="rounded-lg bg-primary/10 p-2">
					<HugeiconsIcon className="size-6 text-primary" icon={Search01Icon} />
				</div>
				<div>
					<h1 className="text-balance font-bold text-2xl">{t('search.advanced')}</h1>
					<p className="text-pretty text-muted-foreground text-sm">
						{t('search.advancedDescription')}
					</p>
				</div>
			</div>

			{/* Advanced Search Component */}
			<AdvancedSearch
				initialFilters={initialFilters}
				initialQuery={q}
				showHistory
				showSuggestions
			/>
		</div>
	)
}

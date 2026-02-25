import type { WebSearchResult } from '@folionote/ai-tools'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@folionote/ui/sheet'
import { getFaviconUrl, getHostname, truncateText } from '@folionote/utils'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

type WebSearchPanelData = {
	query: string
	results: WebSearchResult[]
}

type WebSearchPanelProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	data: WebSearchPanelData | null
}

const SearchResultItem = memo(function SearchResultItem({
	result,
}: {
	result: WebSearchResult
}) {
	const hostname = getHostname(result.url)
	const snippet = result.snippet ? truncateText(result.snippet, 300) : null

	return (
		<a
			className="group block rounded-lg border border-transparent p-3 transition-colors duration-150 hover:border-border/40 hover:bg-muted/40"
			href={result.url}
			rel="noopener noreferrer"
			target="_blank"
		>
			<div className="flex items-start gap-2.5">
				<img
					alt=""
					className="mt-0.5 size-4 shrink-0 rounded"
					loading="lazy"
					src={getFaviconUrl(result.url)}
				/>
				<div className="min-w-0 flex-1">
					<div className="font-medium text-foreground text-sm leading-snug group-hover:text-primary">
						{result.title}
					</div>
					<div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/60">
						{hostname}
					</div>
				</div>
			</div>
			{snippet ? (
				<div className="mt-1.5 pl-6.5 text-muted-foreground text-xs leading-relaxed">
					{snippet}
				</div>
			) : null}
		</a>
	)
})

export const WebSearchPanel = memo(function WebSearchPanel({
	open,
	onOpenChange,
	data,
}: WebSearchPanelProps) {
	const { t } = useTranslation()

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent
				className="w-[90vw] max-w-[480px] overflow-hidden p-0 sm:w-[420px]"
				side="right"
			>
				<SheetHeader className="border-b px-4 py-3">
					<div className="flex items-center gap-2">
						<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
							<svg
								aria-hidden="true"
								className="size-3.5"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								viewBox="0 0 24 24"
							>
								<circle cx={11} cy={11} r={8} />
								<path d="m21 21-4.35-4.35" strokeLinecap="round" />
							</svg>
						</div>
						<div className="min-w-0 flex-1">
							<SheetTitle className="text-sm">
								{t('knowledge.toolCards.webSearch.panelTitle')}
							</SheetTitle>
							{data ? (
								<SheetDescription className="mt-0 text-xs">
									{t('knowledge.toolCards.webSearch.panelResultCount', {
										count: data.results.length,
									})}
								</SheetDescription>
							) : null}
						</div>
					</div>

					{data?.query ? (
						<div className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-muted-foreground text-xs">
							{data.query}
						</div>
					) : null}
				</SheetHeader>

				<div className="h-full overflow-y-auto px-2 py-2">
					{data?.results.length ? (
						<div className="grid gap-0.5">
							{data.results.map((result) => (
								<SearchResultItem key={result.url} result={result} />
							))}
						</div>
					) : (
						<div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
							{t('knowledge.toolCards.webSearch.panelNoResults')}
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
})

export type { WebSearchPanelData }

import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { GraphCanvas } from '@/features/graph/graph-canvas'
import { GraphToolbar } from '@/features/graph/graph-toolbar'
import { orpc } from '@/utils/orpc'

type GraphSearchParams = {
	tagId?: string
}

export const Route = createFileRoute('/_app/graph')({
	component: GraphPage,
	validateSearch: (search: Record<string, unknown>): GraphSearchParams => ({
		tagId: typeof search.tagId === 'string' ? search.tagId : undefined,
	}),
})

function GraphPage() {
	const { t } = useTranslation()
	const { tagId: urlTagId } = Route.useSearch()

	const [search, setSearch] = useState('')
	const [includeInferred, setIncludeInferred] = useState(true)
	const [tagFilter, setTagFilter] = useState(urlTagId ?? 'all')
	const [isConnecting, setIsConnecting] = useState(false)

	const { data: graphData, refetch: refetchGraph } = useQuery({
		queryKey: [
			'graph',
			'getGraph',
			tagFilter === 'all' ? undefined : tagFilter,
			includeInferred,
		],
		queryFn: () =>
			orpc.graph.getGraph.call({
				tagId: tagFilter === 'all' ? undefined : tagFilter,
				includeInferred,
			}),
	})

	const { data: tagsData } = useQuery({
		queryKey: ['tags', 'list'],
		queryFn: () => orpc.tags.list.call(),
	})

	const tagsList = useMemo(
		() =>
			(tagsData ?? []).map((tag: { id: string; name: string }) => ({
				id: tag.id,
				name: tag.name,
			})),
		[tagsData]
	)

	const handleConnect = useCallback(
		async (sourceId: string, targetId: string) => {
			try {
				const result = await orpc.graph.addManualLink.call({
					sourceEntryId: sourceId,
					targetEntryId: targetId,
				})
				if (result.alreadyExists) {
					toast.info(t('graph.linkAlreadyExists'))
				} else {
					toast.success(t('graph.linkAdded'))
					refetchGraph()
				}
			} catch {
				toast.error(t('graph.linkFailed'))
			}
		},
		[refetchGraph, t]
	)

	const nodes = graphData?.nodes ?? []
	const edges = graphData?.edges ?? []

	return (
		<div className="flex h-[calc(100svh-3rem)] flex-col md:h-svh">
			<ReactFlowProvider>
				<GraphToolbar
					includeInferred={includeInferred}
					isConnecting={isConnecting}
					onSearchChange={setSearch}
					onTagFilterChange={setTagFilter}
					onToggleConnectMode={() => setIsConnecting((v) => !v)}
					onToggleInferred={() => setIncludeInferred((v) => !v)}
					search={search}
					tagFilter={tagFilter}
					tags={tagsList}
				/>
				<div className="relative flex-1 overflow-hidden">
					{nodes.length === 0 ? (
						<div className="flex h-full items-center justify-center">
							<div className="text-center">
								<p className="font-medium text-lg text-muted-foreground">
									{t('graph.emptyTitle')}
								</p>
								<p className="mt-1 text-muted-foreground/60 text-sm">
									{t('graph.emptyDescription')}
								</p>
							</div>
						</div>
					) : (
						<GraphCanvas
							graphEdges={edges}
							graphNodes={nodes}
							isConnecting={isConnecting}
							onConnect={handleConnect}
							searchHighlight={search}
						/>
					)}
				</div>
			</ReactFlowProvider>
		</div>
	)
}

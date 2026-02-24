import { Button } from '@folionote/ui/button'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { EntryFlowEdge, GraphNodeData } from './types'

type GraphDetailPanelProps = {
	selectedNode: { id: string; data: GraphNodeData } | null
	edges: EntryFlowEdge[]
	nodeMap: Map<string, GraphNodeData>
	onClose: () => void
}

export function GraphDetailPanel({
	selectedNode,
	edges,
	nodeMap,
	onClose,
}: GraphDetailPanelProps) {
	const { t } = useTranslation()

	if (!selectedNode) return null

	const { id, data } = selectedNode

	const outgoing = edges.filter((e) => e.source === id)
	const incoming = edges.filter((e) => e.target === id)

	const displayTitle = data.title.trim() || t('graph.untitled')

	return (
		<div className="absolute top-0 right-0 z-10 flex h-full w-[280px] flex-col border-l bg-background/95 backdrop-blur-sm">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<h3 className="truncate font-semibold text-sm">{displayTitle}</h3>
				<Button onClick={onClose} size="sm" variant="ghost">
					&times;
				</Button>
			</div>

			<div className="flex-1 space-y-4 overflow-y-auto p-4">
				<div className="flex flex-wrap gap-1.5">
					{data.isStarred && (
						<span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
							{t('graph.starred')}
						</span>
					)}
					{data.isPinned && (
						<span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400">
							{t('graph.pinned')}
						</span>
					)}
					{data.isInbox && (
						<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
							{t('graph.inbox')}
						</span>
					)}
				</div>

				{data.tags.length > 0 && (
					<div>
						<h4 className="mb-1 font-medium text-muted-foreground text-xs">
							{t('graph.tags')}
						</h4>
						<div className="flex flex-wrap gap-1">
							{data.tags.map((tag) => (
								<span
									className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
									key={tag.id}
								>
									<span
										className="inline-block h-2 w-2 rounded-full"
										style={{
											backgroundColor: tag.color ?? '#a1a1aa',
										}}
									/>
									{tag.name}
								</span>
							))}
						</div>
					</div>
				)}

				{outgoing.length > 0 && (
					<LinkSection
						direction="outgoing"
						edges={outgoing}
						label={t('graph.referencesTo')}
						nodeMap={nodeMap}
					/>
				)}

				{incoming.length > 0 && (
					<LinkSection
						direction="incoming"
						edges={incoming}
						label={t('graph.referencedBy')}
						nodeMap={nodeMap}
					/>
				)}
			</div>

			<div className="border-t p-3">
				<Link className="block" params={{ id }} to="/entries/$id">
					<Button className="w-full" size="sm" variant="outline">
						{t('graph.openEntry')}
					</Button>
				</Link>
			</div>
		</div>
	)
}

function LinkSection({
	edges,
	label,
	nodeMap,
	direction,
}: {
	edges: EntryFlowEdge[]
	label: string
	nodeMap: Map<string, GraphNodeData>
	direction: 'outgoing' | 'incoming'
}) {
	return (
		<div>
			<h4 className="mb-1 font-medium text-muted-foreground text-xs">
				{label} ({edges.length})
			</h4>
			<ul className="space-y-1">
				{edges.map((edge) => {
					const targetId = direction === 'outgoing' ? edge.target : edge.source
					const nodeData = nodeMap.get(targetId)
					const title = nodeData?.title?.trim() || 'Untitled'
					const linkType = edge.data?.linkType ?? 'ref'

					return (
						<li key={edge.id}>
							<Link
								className={cn(
									'flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-muted',
									linkType === 'ref' && 'text-primary',
									linkType === 'shared-tag' && 'text-muted-foreground italic'
								)}
								params={{ id: targetId }}
								to="/entries/$id"
							>
								<span className="truncate">{title}</span>
								<span className="shrink-0 text-[10px] text-muted-foreground/60">
									{linkType}
								</span>
							</Link>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

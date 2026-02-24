import { Handle, type NodeProps, Position } from '@xyflow/react'
import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { EntryFlowNode } from './types'

function GraphNodeComponent({ data, selected }: NodeProps<EntryFlowNode>) {
	const displayTitle = data.title.trim().length > 0 ? data.title : 'Untitled'
	const truncatedTitle =
		displayTitle.length > 40 ? `${displayTitle.slice(0, 40)}...` : displayTitle

	return (
		<div
			className={cn(
				'min-w-[120px] max-w-[200px] rounded-lg border bg-background px-3 py-2 shadow-sm transition-shadow',
				selected && 'shadow-md ring-2 ring-primary',
				data.isInbox && 'border-muted-foreground/40 border-dashed',
				data.isStarred && 'border-yellow-400/60'
			)}
		>
			<Handle
				className="!h-2 !w-2 !border-muted-foreground/30 !bg-muted-foreground/50"
				position={Position.Top}
				type="target"
			/>

			<div className="flex items-center gap-1.5">
				{data.isStarred && (
					<span className="shrink-0 text-xs text-yellow-500">&#9733;</span>
				)}
				{data.isPinned && (
					<span className="shrink-0 text-muted-foreground text-xs">&#128204;</span>
				)}
				<span className="truncate font-medium text-sm">{truncatedTitle}</span>
			</div>

			{data.tags.length > 0 && (
				<div className="mt-1 flex flex-wrap gap-1">
					{data.tags.slice(0, 3).map((tag) => (
						<span
							className="inline-block h-2 w-2 rounded-full"
							key={tag.id}
							style={{ backgroundColor: tag.color ?? '#a1a1aa' }}
							title={tag.name}
						/>
					))}
					{data.tags.length > 3 && (
						<span className="text-[10px] text-muted-foreground">
							+{data.tags.length - 3}
						</span>
					)}
				</div>
			)}

			<Handle
				className="!h-2 !w-2 !border-muted-foreground/30 !bg-muted-foreground/50"
				position={Position.Bottom}
				type="source"
			/>
		</div>
	)
}

export const EntryNode = memo(GraphNodeComponent)

import { cn } from '@folionote/ui/lib/utils'
import { FileEditIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
	type Ref,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'

export type MentionSuggestionItem = {
	id: string
	title: string
}

export type MentionListRef = {
	onKeyDown: (event: KeyboardEvent) => boolean
}

type MentionListProps = {
	items: MentionSuggestionItem[]
	command: (item: MentionSuggestionItem) => void
	emptyText: string
	ref?: Ref<MentionListRef>
}

export function MentionList({ items, command, emptyText, ref }: MentionListProps) {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const listId = useId()
	const menuRef = useRef<HTMLDivElement>(null)

	const selectItem = useCallback(
		(index: number) => {
			const item = items.at(index)
			if (item) {
				command(item)
			}
		},
		[command, items]
	)

	const moveSelectionUp = useCallback(() => {
		if (items.length === 0) return
		setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
	}, [items.length])

	const moveSelectionDown = useCallback(() => {
		if (items.length === 0) return
		setSelectedIndex((prev) => (prev + 1) % items.length)
	}, [items.length])

	const confirmSelection = useCallback(() => {
		selectItem(selectedIndex)
	}, [selectItem, selectedIndex])

	useEffect(() => {
		setSelectedIndex(0)
	}, [items])

	useEffect(() => {
		const menu = menuRef.current
		if (!menu) return

		const selectedItem = menu.querySelector(
			'[data-mention-index="true"].is-selected'
		)
		if (selectedItem) {
			selectedItem.scrollIntoView({
				block: 'nearest',
				behavior: 'smooth',
			})
		}
	}, [selectedIndex])

	useImperativeHandle(ref, () => ({
		onKeyDown: (event: KeyboardEvent) => {
			if (event.key === 'ArrowUp') {
				moveSelectionUp()
				return true
			}
			if (event.key === 'ArrowDown') {
				moveSelectionDown()
				return true
			}
			if (event.key === 'Enter') {
				confirmSelection()
				return true
			}
			return false
		},
	}))

	if (items.length === 0) {
		return (
			<div className="rounded-lg border bg-popover px-3 py-2 text-muted-foreground text-sm shadow-lg">
				{emptyText}
			</div>
		)
	}

	return (
		<div
			className="max-h-72 w-64 overflow-auto rounded-lg border bg-popover p-1 shadow-lg"
			ref={menuRef}
		>
			{items.map((item, index) => {
				const isSelected = index === selectedIndex
				return (
					<button
						className={cn(
							'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
							'transition-colors duration-150 motion-reduce:transition-none',
							isSelected
								? 'is-selected bg-accent text-accent-foreground'
								: 'hover:bg-accent/70'
						)}
						data-mention-index="true"
						id={`${listId}-option-${item.id}`}
						key={item.id}
						onClick={() => selectItem(index)}
						onMouseEnter={() => setSelectedIndex(index)}
						type="button"
					>
						<HugeiconsIcon
							className="size-3 text-muted-foreground"
							icon={FileEditIcon}
						/>
						<span className="truncate">{item.title}</span>
					</button>
				)
			})}
		</div>
	)
}

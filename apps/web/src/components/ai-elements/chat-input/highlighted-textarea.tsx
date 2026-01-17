import { cn } from '@folionote/ui/lib/utils'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import { useRef } from 'react'

export type HighlightedTextareaProps = {
	value: string
	onChange: (value: string) => void
	onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
	disabled?: boolean
	placeholder?: string
	name?: string
	textareaRef?: RefObject<HTMLTextAreaElement | null>
	/** Rendered content for the highlight overlay */
	highlightedContent: ReactNode
	className?: string
}

export function HighlightedTextarea({
	value,
	onChange,
	onKeyDown,
	disabled,
	placeholder,
	name,
	textareaRef: externalRef,
	highlightedContent,
	className,
}: HighlightedTextareaProps) {
	const internalRef = useRef<HTMLTextAreaElement>(null)
	const textareaRef = externalRef ?? internalRef
	const highlightRef = useRef<HTMLDivElement>(null)

	const handleScroll = () => {
		const textarea = textareaRef.current
		const highlight = highlightRef.current
		if (!(textarea && highlight)) return
		highlight.scrollTop = textarea.scrollTop
		highlight.scrollLeft = textarea.scrollLeft
	}

	return (
		<div className={cn('relative w-full', className)}>
			{/* Textarea with transparent text, visible caret */}
			<textarea
				className={cn(
					'relative z-10 w-full',
					'max-h-[200px] min-h-[100px]',
					'resize-none border-none bg-transparent',
					'px-4 py-3 text-sm leading-5',
					'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-muted-foreground/60',
					'text-transparent caret-foreground selection:bg-primary/20'
				)}
				disabled={disabled}
				name={name}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={onKeyDown}
				onScroll={handleScroll}
				placeholder={placeholder}
				ref={textareaRef}
				value={value}
			/>

			{/* Highlighted content overlay */}
			<div
				aria-hidden="true"
				className={cn(
					'pointer-events-none absolute inset-0 z-0',
					'max-h-[200px] min-h-[100px] overflow-hidden',
					'wrap-break-word whitespace-pre-wrap',
					'px-4 py-3 text-foreground text-sm leading-5'
				)}
				ref={highlightRef}
			>
				{highlightedContent}
			</div>
		</div>
	)
}

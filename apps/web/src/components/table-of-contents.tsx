import { TextAlignLeftIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { TOCItemType } from 'fumadocs-core/toc'
import * as TocPrimitive from 'fumadocs-core/toc'
import { useOnChange } from 'fumadocs-core/utils/use-on-change'
import type { RefObject } from 'react'
import { useEffect, useEffectEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type TableOfContentsPosition = 'left' | 'right'

type TableOfContentsProps = {
	/** Array of TOC items to display (fumadocs format) */
	items: TOCItemType[]
	/** Additional CSS classes */
	className?: string
	/** Which side the TOC is rendered on (affects border/thumb/padding direction) */
	position?: TableOfContentsPosition
}

/**
 * Table of Contents sidebar component using fumadocs-core/toc.
 * Implementation based on fumadocs UI TocThumb with side line highlight.
 *
 * Features:
 * - Sticky positioning with viewport height calculation
 * - Active heading highlighting via IntersectionObserver (from fumadocs)
 * - Side line indicator that follows active heading
 * - Smooth scroll to heading on click
 * - Hidden on mobile (< lg breakpoint)
 */
export function TableOfContents({
	items,
	className,
	position = 'right',
}: TableOfContentsProps) {
	const { t } = useTranslation()
	const containerRef = useRef<HTMLDivElement>(null)
	const isOnLeft = position === 'left'

	// Don't render if no items
	if (items.length === 0) {
		return null
	}

	return (
		<TocPrimitive.AnchorProvider toc={items}>
			<div
				className={cn(
					// Fumadocs-like sticky TOC column
					'sticky top-(--folio-nav-height) h-[calc(100dvh-var(--folio-nav-height))] w-[268px] shrink-0 overflow-auto p-4 pt-12',
					// Hidden on mobile, visible on lg+
					'hidden flex-col lg:flex',
					className
				)}
			>
				<h3
					className="mb-2 inline-flex items-center gap-1.5 text-muted-foreground text-sm"
					id="toc-title"
				>
					<HugeiconsIcon className="size-4" icon={TextAlignLeftIcon} />
					{t('common.onThisPage')}
				</h3>

				<div className="relative">
					{/* Side line thumb indicator */}
					<TocThumb
						className={cn(
							'absolute top-(--folio-toc-top) h-(--folio-toc-height) w-0.5 bg-primary transition-[top,height] duration-200 ease-out data-[hidden=true]:opacity-0',
							isOnLeft ? 'end-0 rounded-s-sm' : 'start-0 rounded-e-sm'
						)}
						containerRef={containerRef}
					/>

					{/* TOC items container */}
					<div
						className={cn(
							'flex flex-col',
							isOnLeft
								? 'border-foreground/10 border-e'
								: 'border-foreground/10 border-s'
						)}
						ref={containerRef}
					>
						{items.map((item) => (
							<TocItem item={item} key={item.url} position={position} />
						))}
					</div>
				</div>
			</div>
		</TocPrimitive.AnchorProvider>
	)
}

type TocThumbMetrics = [top: number, height: number]

/**
 * Calculate the position and height of the thumb indicator
 * based on active anchor elements in the container.
 */
function calculateThumbMetrics(
	container: HTMLElement,
	activeAnchors: string[]
): TocThumbMetrics {
	if (activeAnchors.length === 0 || container.clientHeight === 0) {
		return [0, 0]
	}

	let upper = Number.MAX_VALUE
	let lower = 0

	for (const anchor of activeAnchors) {
		const element = container.querySelector<HTMLElement>(`a[href="#${anchor}"]`)
		if (!element) continue

		const styles = getComputedStyle(element)
		const paddingTop = Number.parseFloat(styles.paddingTop)
		const paddingBottom = Number.parseFloat(styles.paddingBottom)

		upper = Math.min(upper, element.offsetTop + paddingTop)
		lower = Math.max(lower, element.offsetTop + element.clientHeight - paddingBottom)
	}

	if (upper === Number.MAX_VALUE) {
		return [0, 0]
	}

	return [upper, Math.max(0, lower - upper)]
}

/**
 * Thumb indicator component that shows active heading position.
 * Uses fumadocs useOnChange for reliable state synchronization.
 */
function TocThumb({
	className,
	containerRef,
}: {
	className?: string
	containerRef: RefObject<HTMLElement | null>
}) {
	const thumbRef = useRef<HTMLDivElement>(null)
	const activeAnchors = TocPrimitive.useActiveAnchors()

	function updateThumb(metrics: TocThumbMetrics): void {
		const element = thumbRef.current
		if (!element) return
		element.style.setProperty('--folio-toc-top', `${metrics[0]}px`)
		element.style.setProperty('--folio-toc-height', `${metrics[1]}px`)
	}

	// Stable callback for ResizeObserver
	const onResize = useEffectEvent(() => {
		if (containerRef.current) {
			updateThumb(calculateThumbMetrics(containerRef.current, activeAnchors))
		}
	})

	// Handle container resize
	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const observer = new ResizeObserver(onResize)
		observer.observe(container)

		return () => observer.disconnect()
	}, [containerRef])

	// Update thumb position when active anchors change
	useOnChange(activeAnchors, () => {
		if (containerRef.current) {
			updateThumb(calculateThumbMetrics(containerRef.current, activeAnchors))
		}
	})

	return (
		<div
			className={className}
			data-hidden={activeAnchors.length === 0}
			ref={thumbRef}
		/>
	)
}

/**
 * Individual TOC item using fumadocs TOCItem primitive.
 * Uses data-active attribute for styling active state.
 */
function TocItem({
	item,
	position,
}: {
	item: TOCItemType
	position: TableOfContentsPosition
}) {
	const isOnLeft = position === 'left'

	return (
		<TocPrimitive.TOCItem
			className={cn(
				// Base styles matching fumadocs default.tsx
				'py-1.5 text-muted-foreground text-sm transition-colors first:pt-0 last:pb-0',
				// Active state - uses data-active attribute set by fumadocs TOCItem
				'data-[active=true]:text-primary',
				// Depth-based indentation
				item.depth <= 2 && (isOnLeft ? 'pe-3' : 'ps-3'),
				item.depth === 3 && (isOnLeft ? 'pe-6' : 'ps-6'),
				item.depth >= 4 && (isOnLeft ? 'pe-8' : 'ps-8')
			)}
			href={item.url}
		>
			{item.title}
		</TocPrimitive.TOCItem>
	)
}

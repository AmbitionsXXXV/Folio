import { ArrowLeft01Icon, Loading02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { EntryEditor } from '@/components/entry-editor'
import { TableOfContents } from '@/components/table-of-contents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTocPosition } from '@/hooks/use-toc-position'
import { assignHeadingIds, parseTocFromContent } from '@/lib/toc'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/_app/entries/new')({
	component: NewEntryPage,
})

/**
 * Page for composing a new entry and saving it to the library.
 *
 * Presents a title input and rich editor, lets the user save a new entry (which invalidates the entries cache, shows success or error toasts, and navigates to the new entry's edit page), and provides a back button to return to the library.
 *
 * @returns The rendered JSX for the New Entry page component
 */
function NewEntryPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const contentRef = useRef<HTMLDivElement>(null)
	const [tocPosition] = useTocPosition()
	const [tocRenderKey, setTocRenderKey] = useState(0)

	const [title, setTitle] = useState('')
	const [content, setContent] = useState('')
	const [contentJson, setContentJson] = useState('')
	// Debounced content for TOC (500ms delay to match editor's debounce)
	const [debouncedContentJson, setDebouncedContentJson] = useState('')
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Create mutation
	const createMutation = useMutation({
		mutationFn: (data: {
			title?: string
			content?: string
			contentJson?: string
			isInbox?: boolean
		}) => orpc.entries.create.call(data),
		onSuccess: (entry) => {
			queryClient.invalidateQueries({ queryKey: ['entries'] })
			toast.success(t('entry.created'))
			// Navigate to the new entry's edit page
			if (entry) {
				navigate({ to: '/entries/$id', params: { id: entry.id } })
			}
		},
		onError: () => {
			toast.error(t('entry.createFailed'))
		},
	})

	const handleContentChange = useCallback((html: string, json: string) => {
		setContent(html)
		setContentJson(json)

		// Debounce TOC update (500ms to match editor's internal debounce)
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}
		debounceTimerRef.current = setTimeout(() => {
			setDebouncedContentJson(json)
		}, 500)
	}, [])

	// Cleanup debounce timer on unmount
	useEffect(
		() => () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
		},
		[]
	)

	const handleSave = useCallback(() => {
		createMutation.mutate({
			title,
			content,
			contentJson,
			isInbox: false, // New entries from this page go to library
		})
	}, [createMutation, title, content, contentJson])

	const handleGoBack = useCallback(() => {
		navigate({ to: '/library' })
	}, [navigate])

	// Parse TOC items from debounced content
	const tocItems = useMemo(
		() => parseTocFromContent(debouncedContentJson),
		[debouncedContentJson]
	)

	// TipTap uses `immediatelyRender: false`, so headings may not exist in the DOM
	// when fumadocs AnchorProvider tries to observe them. We assign heading ids and
	// remount the TOC once headings are present so IntersectionObserver can attach.
	useEffect(() => {
		const container = contentRef.current
		if (!container || tocItems.length === 0) {
			return
		}

		let didRemount = false

		const assignAndMaybeRemount = () => {
			assignHeadingIds(container, tocItems)

			const hasAnyObservedHeading = tocItems.some((item) => {
				const id = item.url.split('#')[1] ?? item.url.slice(1)
				if (!id) {
					return false
				}

				const element = document.getElementById(id)
				return element !== null && container.contains(element)
			})

			if (hasAnyObservedHeading && !didRemount) {
				didRemount = true
				setTocRenderKey((prev) => prev + 1)
				return true
			}

			return hasAnyObservedHeading
		}

		if (typeof MutationObserver === 'undefined') {
			assignAndMaybeRemount()
			return
		}

		if (assignAndMaybeRemount()) {
			return
		}

		const observer = new MutationObserver(() => {
			if (assignAndMaybeRemount()) {
				observer.disconnect()
			}
		})

		observer.observe(container, { childList: true, subtree: true })
		return () => observer.disconnect()
	}, [tocItems])

	const hasToc = tocItems.length > 0

	return (
		<div
			className={cn('container mx-auto flex', hasToc ? 'max-w-6xl' : 'max-w-4xl')}
		>
			{/* TOC on left side */}
			{hasToc && tocPosition === 'left' && (
				<TableOfContents
					items={tocItems}
					key={tocRenderKey}
					position={tocPosition}
				/>
			)}

			{/* Main content */}
			<div className="min-w-0 flex-1 px-4 py-6">
				{/* Header toolbar */}
				<div className="mb-6 flex items-center justify-between">
					<Button onClick={handleGoBack} size="sm" variant="ghost">
						<HugeiconsIcon className="mr-2 size-4" icon={ArrowLeft01Icon} />
						{t('common.back')}
					</Button>

					<Button
						disabled={createMutation.isPending || !(title.trim() || content.trim())}
						onClick={handleSave}
					>
						{createMutation.isPending ? (
							<>
								<HugeiconsIcon
									className="mr-2 size-4 animate-spin"
									icon={Loading02Icon}
								/>
								{t('editor.saving')}
							</>
						) : (
							t('common.save')
						)}
					</Button>
				</div>

				{/* Title input */}
				<Input
					autoFocus
					className="mb-4 border-none font-bold text-2xl shadow-none focus-visible:ring-0"
					onChange={(e) => setTitle(e.target.value)}
					placeholder={t('entry.title')}
					value={title}
				/>

				{/* Editor */}
				<div ref={contentRef}>
					<EntryEditor
						content={contentJson}
						contentFormat="json"
						onChange={handleContentChange}
						placeholder={t('editor.placeholder')}
					/>
				</div>
			</div>

			{/* TOC on right side */}
			{hasToc && tocPosition === 'right' && (
				<TableOfContents
					items={tocItems}
					key={tocRenderKey}
					position={tocPosition}
				/>
			)}
		</div>
	)
}

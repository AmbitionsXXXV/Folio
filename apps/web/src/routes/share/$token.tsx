import { LockPasswordIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { TOCItemType } from 'fumadocs-core/toc'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EntryEditor } from '@/components/entry-editor'
import { TableOfContents } from '@/components/table-of-contents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useTocPosition } from '@/hooks/use-toc-position'
import { assignHeadingIds, parseTocFromContent } from '@/lib/toc'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/share/$token')({
	component: ShareViewPage,
	head: () => ({
		meta: [
			{
				title: 'Shared Note - FolioNote',
			},
		],
	}),
})

function ShareViewPage() {
	const { t } = useTranslation()
	const { token } = Route.useParams()
	const [password, setPassword] = useState('')
	const [isPasswordVerified, setIsPasswordVerified] = useState(false)

	// Check if share requires password
	const {
		data: shareStatus,
		isLoading: isCheckingPassword,
		error: checkError,
	} = useQuery({
		queryKey: ['share-check', token],
		queryFn: () => orpc.shares.checkRequiresPassword.call({ shareToken: token }),
		retry: false,
	})

	// Fetch shared entry content
	const {
		data: entryData,
		isLoading: isLoadingEntry,
		error: entryError,
	} = useQuery({
		queryKey: ['share-entry', token, isPasswordVerified ? password : ''],
		queryFn: () =>
			orpc.shares.getPublicEntry.call({
				shareToken: token,
				password: shareStatus?.requiresPassword ? password : undefined,
			}),
		enabled: !!shareStatus && (!shareStatus.requiresPassword || isPasswordVerified),
		retry: false,
	})

	// Password verification mutation
	const verifyPasswordMutation = useMutation({
		mutationFn: async () => {
			await orpc.shares.getPublicEntry.call({
				shareToken: token,
				password,
			})
		},
		onSuccess: () => {
			setIsPasswordVerified(true)
		},
	})

	// Loading state
	if (isCheckingPassword) {
		return <LoadingSpinner />
	}

	// Error states
	if (checkError) {
		const errorMessage = getErrorMessage(checkError)
		return (
			<ShareErrorPage
				description={errorMessage.description}
				title={errorMessage.title}
			/>
		)
	}

	// Password required but not verified
	if (shareStatus?.requiresPassword && !isPasswordVerified) {
		return (
			<PasswordForm
				error={verifyPasswordMutation.error}
				isPending={verifyPasswordMutation.isPending}
				onPasswordChange={setPassword}
				onSubmit={() => verifyPasswordMutation.mutate()}
				password={password}
			/>
		)
	}

	// Loading entry
	if (isLoadingEntry) {
		return <LoadingSpinner />
	}

	// Entry error
	if (entryError) {
		const errorMessage = getErrorMessage(entryError)
		return (
			<ShareErrorPage
				description={errorMessage.description}
				title={errorMessage.title}
			/>
		)
	}

	// No entry data
	if (!entryData) {
		return (
			<ShareErrorPage
				description={t('share.notFoundDesc')}
				title={t('share.notFound')}
			/>
		)
	}

	return <ShareContent entryData={entryData} />
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
	return (
		<div className="flex min-h-svh items-center justify-center">
			<Spinner className="size-8 text-muted-foreground" />
		</div>
	)
}

/**
 * Password form component
 */
function PasswordForm({
	password,
	onPasswordChange,
	onSubmit,
	isPending,
	error,
}: {
	password: string
	onPasswordChange: (value: string) => void
	onSubmit: () => void
	isPending: boolean
	error: Error | null
}) {
	const { t } = useTranslation()

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (password.length > 0) {
				onSubmit()
			}
		},
		[password, onSubmit]
	)

	return (
		<div className="flex min-h-svh items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
						<HugeiconsIcon
							className="size-6 text-muted-foreground"
							icon={LockPasswordIcon}
						/>
					</div>
					<CardTitle>{t('share.passwordRequired')}</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={handleSubmit}>
						<Input
							autoFocus
							onChange={(e) => onPasswordChange(e.target.value)}
							placeholder={t('share.enterPassword')}
							type="password"
							value={password}
						/>
						{error && (
							<p className="text-destructive text-sm">{t('share.wrongPassword')}</p>
						)}
						<Button
							className="w-full"
							disabled={password.length === 0 || isPending}
							type="submit"
						>
							{isPending ? <Spinner className="mr-2 size-4" /> : null}
							{t('share.unlock')}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

/**
 * Share content display component
 */
function ShareContent({
	entryData,
}: {
	entryData: {
		entry: {
			title: string
			contentJson: string | null
			createdAt: string
		}
		share: {
			showBranding: boolean
		}
	}
}) {
	const { t } = useTranslation()
	const contentRef = useRef<HTMLDivElement>(null)
	const [tocPosition] = useTocPosition()
	const [tocRenderKey, setTocRenderKey] = useState(0)

	const { entry, share } = entryData

	// Parse TOC items from content
	const tocItems = useMemo<TOCItemType[]>(() => {
		if (!entry.contentJson) {
			return []
		}
		return parseTocFromContent(entry.contentJson)
	}, [entry.contentJson])

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
				// URL is always prefixed with # by makeUniqueItems
				const id = item.url.slice(1)
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
		<div className="flex min-h-svh flex-col bg-background">
			{/* Header */}
			<header className="border-b">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					{share.showBranding ? (
						<Link
							className="font-bold font-script font-script-en text-2xl text-primary"
							to="/"
						>
							FolioNote
						</Link>
					) : (
						<div />
					)}
					{share.showBranding && (
						<Link to="/">
							<Button size="sm" variant="outline">
								{t('share.createYourOwn')}
							</Button>
						</Link>
					)}
				</div>
			</header>

			{/* Content with TOC */}
			<div
				className={cn(
					'container mx-auto flex min-h-0 flex-1',
					hasToc ? 'max-w-6xl' : 'max-w-5xl'
				)}
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
				<main className="min-w-0 flex-1 px-4 py-8">
					<article>
						{/* Title */}
						<h1 className="mb-6 font-bold text-3xl">
							{entry.title || t('entry.untitled')}
						</h1>

						{/* Metadata */}
						<div className="mb-8 flex items-center gap-4 text-muted-foreground text-sm">
							<time dateTime={entry.createdAt}>
								{new Intl.DateTimeFormat(undefined, {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								}).format(new Date(entry.createdAt))}
							</time>
						</div>

						{/* Content */}
						<div
							className="prose prose-lg dark:prose-invert max-w-none"
							ref={contentRef}
						>
							{entry.contentJson ? (
								<EntryEditor
									content={entry.contentJson}
									contentFormat="json"
									editable={false}
								/>
							) : (
								<p className="text-muted-foreground">{t('share.noContent')}</p>
							)}
						</div>
					</article>
				</main>

				{/* TOC on right side */}
				{hasToc && tocPosition === 'right' && (
					<TableOfContents
						items={tocItems}
						key={tocRenderKey}
						position={tocPosition}
					/>
				)}
			</div>

			{/* Footer */}
			{share.showBranding && (
				<footer className="border-t py-8">
					<div className="container mx-auto px-4 text-center">
						<p className="text-muted-foreground text-sm">
							{t('share.poweredBy')}{' '}
							<Link className="font-medium underline" to="/">
								FolioNote
							</Link>
						</p>
					</div>
				</footer>
			)}
		</div>
	)
}

/**
 * Error page component for share errors
 */
function ShareErrorPage({
	title,
	description,
}: {
	title: string
	description: string
}) {
	const { t } = useTranslation()

	return (
		<div className="flex min-h-svh items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
						<HugeiconsIcon
							className="size-6 text-muted-foreground"
							icon={ViewOffIcon}
						/>
					</div>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent className="text-center">
					<p className="mb-6 text-muted-foreground">{description}</p>
					<Link to="/">
						<Button>{t('share.goHome')}</Button>
					</Link>
				</CardContent>
			</Card>
		</div>
	)
}

/**
 * ORPC error code type
 */
type ORPCErrorCode =
	| 'NOT_FOUND'
	| 'FORBIDDEN'
	| 'UNAUTHORIZED'
	| 'INTERNAL_SERVER_ERROR'

/**
 * Parse error message from API error using ORPC error codes
 */
function getErrorMessage(error: unknown): { title: string; description: string } {
	// Check for ORPC error with code property
	if (error && typeof error === 'object' && 'code' in error) {
		const code = (error as { code: ORPCErrorCode }).code
		const message = 'message' in error ? (error as { message: string }).message : ''

		switch (code) {
			case 'NOT_FOUND':
				return {
					title: 'Link Not Found',
					description: 'This share link does not exist or has been removed.',
				}
			case 'FORBIDDEN':
				// Check message for more specific forbidden reason
				if (message.includes('expired')) {
					return {
						title: 'Link Expired',
						description: 'This share link has expired and is no longer accessible.',
					}
				}
				if (message.includes('disabled')) {
					return {
						title: 'Link Disabled',
						description: 'This share link has been disabled by its owner.',
					}
				}
				return {
					title: 'Access Denied',
					description: message || 'You do not have permission to access this link.',
				}
			case 'UNAUTHORIZED':
				return {
					title: 'Authentication Required',
					description: message || 'Please provide valid credentials.',
				}
			case 'INTERNAL_SERVER_ERROR':
				return {
					title: 'Server Error',
					description: 'An internal server error occurred. Please try again later.',
				}
			default:
				return {
					title: 'Error',
					description: message || 'An unexpected error occurred.',
				}
		}
	}

	// Fallback for errors without code
	if (error && typeof error === 'object' && 'message' in error) {
		return {
			title: 'Error',
			description: (error as { message: string }).message,
		}
	}

	return {
		title: 'Error',
		description: 'An unexpected error occurred.',
	}
}

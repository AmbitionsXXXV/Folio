import { LockPasswordIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EntryEditor } from '@/components/entry-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
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
			// Try to fetch the entry with the password
			await orpc.shares.getPublicEntry.call({
				shareToken: token,
				password,
			})
		},
		onSuccess: () => {
			setIsPasswordVerified(true)
		},
	})

	const handlePasswordSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			if (password.length > 0) {
				verifyPasswordMutation.mutate()
			}
		},
		[password, verifyPasswordMutation]
	)

	// Loading state
	if (isCheckingPassword) {
		return (
			<div className="flex min-h-svh items-center justify-center">
				<Spinner className="size-8 text-muted-foreground" />
			</div>
		)
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
						<form className="space-y-4" onSubmit={handlePasswordSubmit}>
							<Input
								autoFocus
								onChange={(e) => setPassword(e.target.value)}
								placeholder={t('share.enterPassword')}
								type="password"
								value={password}
							/>
							{verifyPasswordMutation.error && (
								<p className="text-destructive text-sm">
									{t('share.wrongPassword')}
								</p>
							)}
							<Button
								className="w-full"
								disabled={password.length === 0 || verifyPasswordMutation.isPending}
								type="submit"
							>
								{verifyPasswordMutation.isPending ? (
									<Spinner className="mr-2 size-4" />
								) : null}
								{t('share.unlock')}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Loading entry
	if (isLoadingEntry) {
		return (
			<div className="flex min-h-svh items-center justify-center">
				<Spinner className="size-8 text-muted-foreground" />
			</div>
		)
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

	const { entry, share } = entryData

	return (
		<div className="min-h-svh bg-background">
			{/* Header */}
			<header className="border-b">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					{share.showBranding ? (
						<Link className="font-bold text-xl" to="/">
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

			{/* Content */}
			<main className="container mx-auto max-w-3xl px-4 py-8">
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
					<div className="prose prose-lg dark:prose-invert max-w-none">
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
 * Parse error message from API error
 */
function getErrorMessage(error: unknown): { title: string; description: string } {
	if (error && typeof error === 'object' && 'message' in error) {
		const message = (error as { message: string }).message

		if (message.includes('not found')) {
			return {
				title: 'Link Not Found',
				description: 'This share link does not exist or has been removed.',
			}
		}

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
			title: 'Error',
			description: message,
		}
	}

	return {
		title: 'Error',
		description: 'An unexpected error occurred.',
	}
}

import { Alert02Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
	ErrorComponent,
	type ErrorComponentProps,
	Link,
	useRouter,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from './ui/button'

/**
 * Default error boundary component for route errors.
 * Displays error information and provides retry/navigation options.
 */
export function DefaultErrorBoundary({ error, reset }: ErrorComponentProps) {
	const { t } = useTranslation()
	const router = useRouter()

	const handleRetry = () => {
		reset()
		router.invalidate()
	}

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				{/* Error Icon */}
				<div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
					<HugeiconsIcon
						className="size-8 text-destructive"
						icon={Alert02Icon}
						strokeWidth={2}
					/>
				</div>

				{/* Error Message */}
				<div className="space-y-2">
					<h2 className="font-semibold text-xl">{t('error.serverError')}</h2>
					<p className="text-muted-foreground text-sm">
						{error.message || t('error.unknown')}
					</p>
				</div>

				{/* Dev Mode: Show Error Details */}
				{import.meta.env.DEV && error.stack && (
					<details className="w-full rounded-md bg-muted/50 p-4 text-left">
						<summary className="cursor-pointer font-medium text-sm">
							Error Details
						</summary>
						<pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-muted-foreground text-xs">
							{error.stack}
						</pre>
					</details>
				)}

				{/* Action Buttons */}
				<div className="flex gap-3">
					<Button onClick={handleRetry} variant="default">
						<HugeiconsIcon className="mr-2 size-4" icon={RefreshIcon} />
						{t('common.retry')}
					</Button>
					<Link className={buttonVariants({ variant: 'outline' })} to="/">
						{t('nav.home')}
					</Link>
				</div>
			</div>
		</div>
	)
}

/**
 * Minimal error component that wraps TanStack Router's built-in ErrorComponent.
 * Use this when you want the default error display behavior.
 */
export function MinimalErrorBoundary({ error }: ErrorComponentProps) {
	return <ErrorComponent error={error} />
}

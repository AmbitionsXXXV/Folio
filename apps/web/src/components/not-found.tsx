import { FileNotFoundIcon, Home01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from './ui/button'

/**
 * Default 404 Not Found component.
 * Displays a friendly message and provides navigation back to home.
 */
export function NotFound() {
	const { t } = useTranslation()

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				{/* Not Found Icon */}
				<div className="flex size-16 items-center justify-center rounded-full bg-muted">
					<HugeiconsIcon
						className="size-8 text-muted-foreground"
						icon={FileNotFoundIcon}
						strokeWidth={2}
					/>
				</div>

				{/* Message */}
				<div className="space-y-2">
					<h2 className="font-semibold text-xl">404</h2>
					<p className="text-muted-foreground text-sm">{t('error.notFound')}</p>
				</div>

				{/* Action Button */}
				<Link className={buttonVariants({ variant: 'default' })} to="/">
					<HugeiconsIcon className="mr-2 size-4" icon={Home01Icon} />
					{t('nav.home')}
				</Link>
			</div>
		</div>
	)
}

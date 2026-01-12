import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type ShareHeaderProps = {
	showBranding: boolean
}

/**
 * Header component for share page
 */
export function ShareHeader({ showBranding }: ShareHeaderProps) {
	const { t } = useTranslation()

	return (
		<header className="border-b">
			<div className="container mx-auto flex items-center justify-between px-4 py-4">
				{showBranding ? (
					<Link
						className="font-bold font-script font-script-en text-2xl text-primary"
						to="/"
					>
						FolioNote
					</Link>
				) : (
					<div />
				)}
				{showBranding && (
					<Link to="/">
						<Button size="sm" variant="outline">
							{t('share.createYourOwn')}
						</Button>
					</Link>
				)}
			</div>
		</header>
	)
}

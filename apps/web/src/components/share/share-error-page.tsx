import { ViewOffIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ShareErrorPageProps } from '@/types/share'

/**
 * Error page component for share errors
 */
export function ShareErrorPage({ title, description }: ShareErrorPageProps) {
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
					<CardTitle className="text-balance">{title}</CardTitle>
				</CardHeader>
				<CardContent className="text-center">
					<p className="mb-6 text-pretty text-muted-foreground">{description}</p>
					<Link to="/">
						<Button>{t('share.goHome')}</Button>
					</Link>
				</CardContent>
			</Card>
		</div>
	)
}

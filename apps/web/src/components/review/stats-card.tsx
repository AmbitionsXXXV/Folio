import { Card, CardContent } from '@folionote/ui/card'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { StatsCardProps } from '@/types/review'

/**
 * StatsCard - Single statistics card component
 */
export function StatsCard({ value, description, icon, iconColor }: StatsCardProps) {
	const { t } = useTranslation()

	return (
		<Card>
			<CardContent className="flex items-center gap-4">
				<div className="rounded-lg bg-muted p-2">
					<HugeiconsIcon className={cn('size-5', iconColor)} icon={icon} />
				</div>
				<div>
					<p className="font-bold text-2xl">{value}</p>
					<p className="text-muted-foreground text-sm">{t(description)}</p>
				</div>
			</CardContent>
		</Card>
	)
}

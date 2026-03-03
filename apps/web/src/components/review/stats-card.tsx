import { Card, CardContent } from '@folionote/ui/card'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { StatsCardProps } from '@/types/review'

/**
 * StatsCard - Single statistics card component with glassmorphism styling
 */
export function StatsCard({ value, description, icon, iconColor }: StatsCardProps) {
	const { t } = useTranslation()

	return (
		<Card className="border-border/40 bg-card/60 backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
			<CardContent className="flex items-center gap-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-purple-500/10">
					<HugeiconsIcon className={cn('size-5', iconColor)} icon={icon} />
				</div>
				<div className="min-w-0">
					<p className="font-bold text-2xl tabular-nums">{value}</p>
					<p className="truncate text-muted-foreground text-sm">{t(description)}</p>
				</div>
			</CardContent>
		</Card>
	)
}

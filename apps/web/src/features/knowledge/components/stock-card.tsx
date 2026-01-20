import { memo } from 'react'
import { cn } from '@/lib/utils'

export type StockChangeTone = 'up' | 'down' | 'flat'

type StockCardProps = {
	title: string
	symbol: string
	priceLabel: string
	priceValue: string
	changeLabel: string
	changeValue: string
	changeTone: StockChangeTone
	className?: string
}

const changeToneStyles: Record<StockChangeTone, string> = {
	up: 'text-emerald-600',
	down: 'text-red-500',
	flat: 'text-muted-foreground',
}

export const StockCard = memo(function StockCard({
	title,
	symbol,
	priceLabel,
	priceValue,
	changeLabel,
	changeValue,
	changeTone,
	className,
}: StockCardProps) {
	return (
		<div className={cn('grid gap-2 text-xs', className)}>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<div className="text-balance font-medium text-foreground">{title}</div>
					<div className="truncate text-muted-foreground text-xs">{symbol}</div>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div className="rounded-md bg-muted/40 px-2 py-1">
					<div className="text-[10px] text-muted-foreground">{priceLabel}</div>
					<div className="font-[tabular-nums] font-semibold text-base text-foreground">
						{priceValue}
					</div>
				</div>
				<div className="rounded-md bg-muted/40 px-2 py-1">
					<div className="text-[10px] text-muted-foreground">{changeLabel}</div>
					<div
						className={cn(
							'font-[tabular-nums] font-semibold text-base',
							changeToneStyles[changeTone]
						)}
					>
						{changeValue}
					</div>
				</div>
			</div>
		</div>
	)
})

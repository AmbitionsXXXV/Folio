import { memo } from 'react'
import { cn } from '@/lib/utils'

type WeatherCardProps = {
	title: string
	location: string
	condition: string
	temperatureLabel: string
	temperatureValue: string
	humidityLabel: string
	humidityValue: string
	windLabel: string
	windValue: string
	className?: string
}

export const WeatherCard = memo(function WeatherCard({
	title,
	location,
	condition,
	temperatureLabel,
	temperatureValue,
	humidityLabel,
	humidityValue,
	windLabel,
	windValue,
	className,
}: WeatherCardProps) {
	return (
		<div className={cn('grid gap-2 text-xs', className)}>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<div className="text-balance font-medium text-foreground">{title}</div>
					<div className="truncate text-muted-foreground text-xs">{location}</div>
				</div>
			</div>
			<div className="text-pretty text-muted-foreground text-xs">{condition}</div>
			<div className="grid grid-cols-2 gap-2">
				<div className="col-span-2 rounded-md bg-muted/40 px-2 py-1">
					<div className="text-[10px] text-muted-foreground">{temperatureLabel}</div>
					<div className="font-[tabular-nums] font-semibold text-base text-foreground">
						{temperatureValue}
					</div>
				</div>
				<div className="rounded-md bg-muted/30 px-2 py-1">
					<div className="text-[10px] text-muted-foreground">{humidityLabel}</div>
					<div className="font-[tabular-nums] font-medium text-foreground">
						{humidityValue}
					</div>
				</div>
				<div className="rounded-md bg-muted/30 px-2 py-1">
					<div className="text-[10px] text-muted-foreground">{windLabel}</div>
					<div className="font-[tabular-nums] font-medium text-foreground">
						{windValue}
					</div>
				</div>
			</div>
		</div>
	)
})

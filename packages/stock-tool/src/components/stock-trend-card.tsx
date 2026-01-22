import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@folionote/ui/charts'
import { cn } from '@folionote/ui/lib/utils'
import { memo, useMemo } from 'react'
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from 'recharts'
import type { StockChangeTone, StockTrendCardProps } from '../types'

const toneColors: Record<StockChangeTone, { stroke: string; text: string }> = {
	up: {
		stroke: 'hsl(var(--chart-success, 142 71% 45%))',
		text: 'text-emerald-600 dark:text-emerald-400',
	},
	down: {
		stroke: 'hsl(var(--chart-danger, 0 84% 60%))',
		text: 'text-red-500 dark:text-red-400',
	},
	flat: {
		stroke: 'hsl(var(--muted-foreground))',
		text: 'text-muted-foreground',
	},
}

const chartConfig = {
	close: { label: 'Close Price' },
} satisfies ChartConfig

export const StockTrendCard = memo(function StockTrendCard({
	title,
	symbol,
	dateRange,
	currentPrice,
	periodChange,
	changeTone,
	dataPoints,
	className,
}: StockTrendCardProps) {
	const colors = toneColors[changeTone]

	const chartData = useMemo(
		() =>
			dataPoints.map((point) => ({
				date: point.date,
				close: point.close,
				// Format date for display
				label: new Date(point.date).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
				}),
			})),
		[dataPoints]
	)

	const [minPrice, maxPrice] = useMemo(() => {
		const prices = dataPoints.map((p) => p.close)
		const min = Math.min(...prices)
		const max = Math.max(...prices)
		const padding = (max - min) * 0.1
		return [min - padding, max + padding]
	}, [dataPoints])

	const startPrice = dataPoints[0]?.close

	return (
		<div
			className={cn(
				'group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md',
				className
			)}
		>
			{/* Header */}
			<div className="mb-3 flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<h3 className="truncate font-semibold text-foreground text-sm">{title}</h3>
					<p className="text-muted-foreground text-xs">{symbol}</p>
				</div>
				<div className="text-right">
					<p className="font-bold font-mono text-foreground tabular-nums">
						{currentPrice}
					</p>
					<p className={cn('font-mono text-xs tabular-nums', colors.text)}>
						{periodChange}
					</p>
				</div>
			</div>

			{/* Date range label */}
			<p className="mb-2 text-muted-foreground text-xs">{dateRange}</p>

			{/* Line Chart */}
			<ChartContainer className="h-40 w-full" config={chartConfig}>
				<LineChart
					data={chartData}
					margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
				>
					<CartesianGrid className="stroke-muted/30" strokeDasharray="3 3" />
					<XAxis
						axisLine={false}
						dataKey="label"
						interval="preserveStartEnd"
						tick={{ fontSize: 10 }}
						tickLine={false}
					/>
					<YAxis
						axisLine={false}
						domain={[minPrice, maxPrice]}
						tick={{ fontSize: 10 }}
						tickFormatter={(value) => `$${value.toFixed(0)}`}
						tickLine={false}
						width={45}
					/>
					<ChartTooltip
						content={
							<ChartTooltipContent
								formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Close']}
							/>
						}
					/>
					{startPrice && (
						<ReferenceLine
							stroke="hsl(var(--muted-foreground))"
							strokeDasharray="3 3"
							strokeOpacity={0.5}
							y={startPrice}
						/>
					)}
					<Line
						activeDot={{ r: 4, fill: colors.stroke }}
						dataKey="close"
						dot={false}
						stroke={colors.stroke}
						strokeWidth={2}
						type="monotone"
					/>
				</LineChart>
			</ChartContainer>
		</div>
	)
})

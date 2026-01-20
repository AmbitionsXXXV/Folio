import { type ChartConfig, ChartContainer } from '@folionote/ui/charts'
import { memo } from 'react'
import { Area, AreaChart } from 'recharts'
import { cn } from '@/lib/utils'

export type StockChangeTone = 'up' | 'down' | 'flat'

type StockDataPoint = {
	time: string
	price: number
}

type StockCardProps = {
	title: string
	symbol: string
	priceLabel: string
	priceValue: string
	changeLabel: string
	changeValue: string
	changeTone: StockChangeTone
	chartData?: StockDataPoint[]
	className?: string
}

const changeToneConfig: Record<
	StockChangeTone,
	{ text: string; gradient: string; stroke: string }
> = {
	up: {
		text: 'text-emerald-600 dark:text-emerald-400',
		gradient: 'from-emerald-500/20 to-emerald-500/0',
		stroke: 'hsl(var(--chart-success, 142 71% 45%))',
	},
	down: {
		text: 'text-red-500 dark:text-red-400',
		gradient: 'from-red-500/20 to-red-500/0',
		stroke: 'hsl(var(--chart-danger, 0 84% 60%))',
	},
	flat: {
		text: 'text-muted-foreground',
		gradient: 'from-muted/40 to-muted/0',
		stroke: 'hsl(var(--muted-foreground))',
	},
}

const chartConfig = {
	price: {
		label: 'Price',
	},
} satisfies ChartConfig

export const StockCard = memo(function StockCard({
	title,
	symbol,
	priceLabel,
	priceValue,
	changeLabel,
	changeValue,
	changeTone,
	chartData,
	className,
}: StockCardProps) {
	const toneStyle = changeToneConfig[changeTone]

	return (
		<div
			className={cn(
				'group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md',
				className
			)}
		>
			{/* 背景装饰 */}
			<div
				className={cn(
					'absolute inset-0 bg-linear-to-b opacity-50 transition-opacity group-hover:opacity-70',
					toneStyle.gradient
				)}
			/>

			{/* 内容区域 */}
			<div className="relative z-10 grid gap-3">
				{/* 头部：标题与符号 */}
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<h3 className="truncate font-semibold text-foreground text-sm">
							{title}
						</h3>
						<p className="text-muted-foreground text-xs">{symbol}</p>
					</div>
					{/* 涨跌指示器 */}
					<div
						className={cn(
							'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
							changeTone === 'up' && 'bg-emerald-500/10',
							changeTone === 'down' && 'bg-red-500/10',
							changeTone === 'flat' && 'bg-muted'
						)}
					>
						{changeTone === 'up' && (
							<svg
								className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
								fill="none"
								stroke="currentColor"
								strokeWidth={2.5}
								viewBox="0 0 24 24"
							>
								<title>Trend up</title>
								<path
									d="M5 15l7-7 7 7"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						)}
						{changeTone === 'down' && (
							<svg
								className="h-3 w-3 text-red-500 dark:text-red-400"
								fill="none"
								stroke="currentColor"
								strokeWidth={2.5}
								viewBox="0 0 24 24"
							>
								<title>Trend down</title>
								<path
									d="M19 9l-7 7-7-7"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						)}
						{changeTone === 'flat' && (
							<svg
								className="h-3 w-3 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								strokeWidth={2.5}
								viewBox="0 0 24 24"
							>
								<title>No change</title>
								<path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						)}
					</div>
				</div>

				{/* 迷你走势图 */}
				{chartData && chartData.length > 0 && (
					<ChartContainer
						className="h-12 w-full [&_.recharts-cartesian-grid]:hidden"
						config={chartConfig}
					>
						<AreaChart
							data={chartData}
							margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
						>
							<defs>
								<linearGradient
									id={`gradient-${symbol}`}
									x1="0"
									x2="0"
									y1="0"
									y2="1"
								>
									<stop offset="0%" stopColor={toneStyle.stroke} stopOpacity={0.3} />
									<stop offset="100%" stopColor={toneStyle.stroke} stopOpacity={0} />
								</linearGradient>
							</defs>
							<Area
								dataKey="price"
								dot={false}
								fill={`url(#gradient-${symbol})`}
								isAnimationActive={false}
								stroke={toneStyle.stroke}
								strokeWidth={1.5}
								type="monotone"
							/>
						</AreaChart>
					</ChartContainer>
				)}

				{/* 价格与涨跌幅 */}
				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-lg bg-muted/30 px-3 py-2 backdrop-blur-sm">
						<p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
							{priceLabel}
						</p>
						<p className="mt-0.5 font-bold font-mono text-foreground text-lg tabular-nums">
							{priceValue}
						</p>
					</div>
					<div className="rounded-lg bg-muted/30 px-3 py-2 backdrop-blur-sm">
						<p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
							{changeLabel}
						</p>
						<p
							className={cn(
								'mt-0.5 font-bold font-mono text-lg tabular-nums',
								toneStyle.text
							)}
						>
							{changeValue}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
})

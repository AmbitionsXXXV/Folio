'use client'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: SliderPrimitive.Root.Props) {
	const _values = React.useMemo(() => {
		if (Array.isArray(value)) {
			return value
		}
		if (Array.isArray(defaultValue)) {
			return defaultValue
		}
		return [min, max]
	}, [value, defaultValue, min, max])

	return (
		<SliderPrimitive.Root
			className="data-vertical:h-full data-horizontal:w-full"
			data-slot="slider"
			defaultValue={defaultValue}
			max={max}
			min={min}
			thumbAlignment="edge"
			value={value}
			{...props}
		>
			<SliderPrimitive.Control
				className={cn(
					'etc-slider relative flex w-full touch-none select-none items-center data-vertical:h-full data-vertical:w-auto data-vertical:flex-col data-disabled:opacity-50',
					className
				)}
			>
				<SliderPrimitive.Track
					className="etc-slider-track relative select-none overflow-hidden"
					data-slot="slider-track"
				>
					<SliderPrimitive.Indicator
						className="etc-slider-range select-none data-horizontal:h-full data-vertical:w-full"
						data-slot="slider-range"
					/>
				</SliderPrimitive.Track>
				{Array.from({ length: _values.length }, (_, index) => (
					<SliderPrimitive.Thumb
						className="etc-slider-thumb block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
						data-slot="slider-thumb"
						key={`${index}-${_values[index]}`}
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	)
}

export { Slider }

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

function Switch({
	className,
	size = 'default',
	...props
}: SwitchPrimitive.Root.Props & {
	size?: 'sm' | 'default'
}) {
	return (
		<SwitchPrimitive.Root
			className={cn(
				'etc-switch peer group/switch relative inline-flex items-center outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50',
				className
			)}
			data-size={size}
			data-slot="switch"
			{...props}
		>
			<SwitchPrimitive.Thumb
				className="etc-switch-thumb pointer-events-none block ring-0 transition-transform"
				data-slot="switch-thumb"
			/>
		</SwitchPrimitive.Root>
	)
}

export { Switch }

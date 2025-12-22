import { Select as SelectPrimitive } from '@base-ui/react/select'
import {
	ArrowDown01Icon,
	ArrowUp01Icon,
	Tick02Icon,
	UnfoldMoreIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
	return (
		<SelectPrimitive.Group
			className={cn('cn-select-group', className)}
			data-slot="select-group"
			{...props}
		/>
	)
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
	return (
		<SelectPrimitive.Value
			className={cn('cn-select-value', className)}
			data-slot="select-value"
			{...props}
		/>
	)
}

function SelectTrigger({
	className,
	size = 'default',
	children,
	...props
}: SelectPrimitive.Trigger.Props & {
	size?: 'sm' | 'default'
}) {
	return (
		<SelectPrimitive.Trigger
			className={cn(
				'cn-select-trigger flex w-fit items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
				className
			)}
			data-size={size}
			data-slot="select-trigger"
			{...props}
		>
			{children}
			<SelectPrimitive.Icon
				render={
					<HugeiconsIcon
						className="cn-select-trigger-icon pointer-events-none"
						icon={UnfoldMoreIcon}
					/>
				}
			/>
		</SelectPrimitive.Trigger>
	)
}

function SelectContent({
	className,
	children,
	side = 'bottom',
	sideOffset = 4,
	align = 'center',
	alignOffset = 0,
	alignItemWithTrigger = true,
	...props
}: SelectPrimitive.Popup.Props &
	Pick<
		SelectPrimitive.Positioner.Props,
		'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
	>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Positioner
				align={align}
				alignItemWithTrigger={alignItemWithTrigger}
				alignOffset={alignOffset}
				className="isolate z-50"
				side={side}
				sideOffset={sideOffset}
			>
				<SelectPrimitive.Popup
					className={cn(
						'cn-select-content cn-menu-target relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-y-auto overflow-x-hidden',
						className
					)}
					data-slot="select-content"
					{...props}
				>
					<SelectScrollUpButton />
					<SelectPrimitive.List>{children}</SelectPrimitive.List>
					<SelectScrollDownButton />
				</SelectPrimitive.Popup>
			</SelectPrimitive.Positioner>
		</SelectPrimitive.Portal>
	)
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
	return (
		<SelectPrimitive.GroupLabel
			className={cn('cn-select-label', className)}
			data-slot="select-label"
			{...props}
		/>
	)
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
	return (
		<SelectPrimitive.Item
			className={cn(
				'cn-select-item relative flex w-full cursor-default select-none items-center outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
				className
			)}
			data-slot="select-item"
			{...props}
		>
			<SelectPrimitive.ItemText className="cn-select-item-text shrink-0 whitespace-nowrap">
				{children}
			</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator
				render={<span className="cn-select-item-indicator" />}
			>
				<HugeiconsIcon
					className="cn-select-item-indicator-icon pointer-events-none"
					icon={Tick02Icon}
				/>
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	)
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
	return (
		<SelectPrimitive.Separator
			className={cn('cn-select-separator pointer-events-none', className)}
			data-slot="select-separator"
			{...props}
		/>
	)
}

function SelectScrollUpButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
	return (
		<SelectPrimitive.ScrollUpArrow
			className={cn('cn-select-scroll-up-button top-0 w-full', className)}
			data-slot="select-scroll-up-button"
			{...props}
		>
			<HugeiconsIcon icon={ArrowUp01Icon} />
		</SelectPrimitive.ScrollUpArrow>
	)
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
	return (
		<SelectPrimitive.ScrollDownArrow
			className={cn('cn-select-scroll-down-button bottom-0 w-full', className)}
			data-slot="select-scroll-down-button"
			{...props}
		>
			<HugeiconsIcon icon={ArrowDown01Icon} />
		</SelectPrimitive.ScrollDownArrow>
	)
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
}

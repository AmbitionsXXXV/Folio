import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const buttonGroupVariants = cva(
	"cn-button-group flex w-fit items-stretch [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
	{
		variants: {
			orientation: {
				horizontal:
					'cn-button-group-orientation-horizontal [&>[data-slot]]:rounded-r-none [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0',
				vertical:
					'cn-button-group-orientation-vertical flex-col [&>[data-slot]]:rounded-b-none [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0',
			},
		},
		defaultVariants: {
			orientation: 'horizontal',
		},
	}
)

function ButtonGroup({
	className,
	orientation,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
	return (
		<div
			className={cn(buttonGroupVariants({ orientation }), className)}
			data-orientation={orientation}
			data-slot="button-group"
			role="group"
			{...props}
		/>
	)
}

function ButtonGroupText({
	className,
	render,
	...props
}: useRender.ComponentProps<'div'>) {
	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(
					'cn-button-group-text flex items-center [&_svg]:pointer-events-none',
					className
				),
			},
			props
		),
		render,
		state: {
			slot: 'button-group-text',
		},
	})
}

function ButtonGroupSeparator({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			className={cn(
				'cn-button-group-separator relative self-stretch data-[orientation=horizontal]:mx-px data-[orientation=vertical]:my-px data-[orientation=vertical]:h-auto data-[orientation=horizontal]:w-auto',
				className
			)}
			data-slot="button-group-separator"
			orientation={orientation}
			{...props}
		/>
	)
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants }

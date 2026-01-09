import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * AlertDialog is built on top of Dialog but prevents closing by clicking outside
 * or pressing Escape, requiring explicit user action.
 */
function AlertDialog({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="alert-dialog-close" {...props} />
}

function AlertDialogOverlay({
	className,
	...props
}: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			className={cn(
				'data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate z-50 bg-black/20 duration-100 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs',
				className
			)}
			data-slot="alert-dialog-overlay"
			{...props}
		/>
	)
}

function AlertDialogContent({
	className,
	children,
	...props
}: DialogPrimitive.Popup.Props) {
	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<DialogPrimitive.Popup
				className={cn(
					'data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-background p-6 text-sm outline-none ring-1 ring-foreground/10 duration-100 data-closed:animate-out data-open:animate-in sm:max-w-md',
					className
				)}
				data-slot="alert-dialog-content"
				{...props}
			>
				{children}
			</DialogPrimitive.Popup>
		</AlertDialogPortal>
	)
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-2', className)}
			data-slot="alert-dialog-header"
			{...props}
		/>
	)
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
				className
			)}
			data-slot="alert-dialog-footer"
			{...props}
		/>
	)
}

function AlertDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			className={cn('font-medium leading-none', className)}
			data-slot="alert-dialog-title"
			{...props}
		/>
	)
}

function AlertDialogDescription({
	className,
	...props
}: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			className={cn('text-muted-foreground text-sm', className)}
			data-slot="alert-dialog-description"
			{...props}
		/>
	)
}

function AlertDialogCancel({
	className,
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<DialogPrimitive.Close
			render={<Button className={className} variant="outline" {...props} />}
		/>
	)
}

function AlertDialogAction({
	className,
	...props
}: React.ComponentProps<typeof Button>) {
	return <Button className={className} {...props} />
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogClose,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
}

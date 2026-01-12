import { Spinner } from '@/components/ui/spinner'

/**
 * Loading spinner component for share pages
 */
export function ShareLoading() {
	return (
		<div className="flex min-h-svh items-center justify-center">
			<Spinner className="size-8 text-muted-foreground" />
		</div>
	)
}

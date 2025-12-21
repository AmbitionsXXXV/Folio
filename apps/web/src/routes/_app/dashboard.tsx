import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/_app/dashboard')({
	component: RouteComponent,
})

function RouteComponent() {
	const { session } = Route.useRouteContext()
	const privateData = useQuery(orpc.privateData.queryOptions())

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			<h1 className="mb-4 font-bold text-2xl">Dashboard</h1>
			<p className="mb-2">Welcome {session.user.name}</p>
			<p className="text-muted-foreground">API: {privateData.data?.message}</p>
		</div>
	)
}
